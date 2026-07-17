package com.group9.campusqa.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 异步任务线程池配置。
 *
 * <p>为 Day4 文档异步处理提供独立的线程池。
 * 文档上传后立即返回 docId，实际的文件解析与向量化由
 * {@code DocumentProcessService} 在此线程池中异步执行。</p>
 *
 * <p>使用方式：在 Service 方法上标注 {@code @Async("docProcessExecutor")}，
 * 并由 Spring 代理调用（不可同类自调用，否则 @Async 不生效）。</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    /**
     * 文档处理线程池。
     *
     * <ul>
     *   <li>核心线程 2，最大 4——避免同时处理过多大文件撑满 CPU/内存</li>
     *   <li>队列容量 50——超出时由 CallerRunsPolicy 降级</li>
     *   <li>线程名前缀 doc-async- 便于日志排查</li>
     * </ul>
     */
    @Bean("docProcessExecutor")
    public Executor docProcessExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setKeepAliveSeconds(120);
        executor.setThreadNamePrefix("doc-async-");
        // 队列满时由调用线程执行，保证不丢任务
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        log.info("文档处理线程池已初始化: core=2, max=4, queue=50");
        return executor;
    }
}
