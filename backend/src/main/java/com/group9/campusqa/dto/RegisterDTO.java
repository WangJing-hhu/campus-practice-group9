package com.group9.campusqa.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RegisterDTO {
    @NotBlank(message = "???????")
    @Size(min = 2, max = 50, message = "???????2-50?")
    private String username;
    @NotBlank(message = "??????")
    @Size(min = 6, max = 72, message = "??????6-72?")
    private String password;
    @NotBlank(message = "??????")
    @Email(message = "???????")
    private String email;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
