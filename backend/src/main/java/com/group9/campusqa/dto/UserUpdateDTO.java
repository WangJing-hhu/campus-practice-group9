package com.group9.campusqa.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class UserUpdateDTO {
    @NotBlank(message = "??????")
    @Email(message = "???????")
    private String email;
    @NotBlank(message = "??????")
    @Pattern(regexp = "admin|user", message = "?????admin?user")
    private String role;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
