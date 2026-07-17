package com.group9.campusqa.config;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

/**
 * WebClient 配置——用于 Java 调用 Python AI 服务。
 *
 * <p>创建一个可复用的 WebClient Bean，配置：
 * <ul>
 *   <li>AI 服务 base-url（来自 campus-qa.ai.base-url，默认 http://localhost:8000）</li>
 *   <li>连接超时 5 秒，响应超时 120 秒（大文件处理可能较慢）</li>
 *   <li>内部 callback Token header</li>
 * </ul></p>
 */
@Configuration
public class WebClientConfig {

    private static final Logger log = LoggerFactory.getLogger(WebClientConfig.class);

    /** Python AI 服务地址 */
    @Value("${campus-qa.ai.base-url:http://localhost:8000}")
    private String aiBaseUrl;

    /** 内部回调 Token（仅 localhost 通信，防外部伪造） */
    @Value("${campus-qa.ai.callback-token:day4-internal-callback-token}")
    private String callbackToken;

    /** 连接超时秒数 */
    @Value("${campus-qa.ai.connect-timeout:5}")
    private int connectTimeout;

    /** 响应超时秒数 */
    @Value("${campus-qa.ai.response-timeout:120}")
    private int responseTimeout;

    @Bean("aiWebClient")
    public WebClient aiWebClient() {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeout * 1000)
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(responseTimeout))
                        .addHandlerLast(new WriteTimeoutHandler(30)))
                .responseTimeout(Duration.ofSeconds(responseTimeout));

        WebClient client = WebClient.builder()
                .baseUrl(aiBaseUrl)
                .defaultHeader("X-Internal-Token", callbackToken)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();

        log.info("AI WebClient 已初始化: baseUrl={}, connectTimeout={}s, responseTimeout={}s",
                aiBaseUrl, connectTimeout, responseTimeout);
        return client;
    }

    /** 暴露 callback token 供 AiClient 使用 */
    public String getCallbackToken() {
        return callbackToken;
    }
}
