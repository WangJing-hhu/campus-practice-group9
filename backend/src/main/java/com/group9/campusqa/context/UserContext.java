package com.group9.campusqa.context;

public final class UserContext {
    private static final ThreadLocal<CurrentUser> CURRENT = new ThreadLocal<>();

    private UserContext() {}

    public static void set(CurrentUser user) { CURRENT.set(user); }
    public static CurrentUser get() { return CURRENT.get(); }
    public static void clear() { CURRENT.remove(); }

    public record CurrentUser(Long id, String username, String role) {}
}
