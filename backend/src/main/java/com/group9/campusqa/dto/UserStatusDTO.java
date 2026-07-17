package com.group9.campusqa.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class UserStatusDTO {
    @NotNull(message = "??????")
    @Min(value = 0, message = "?????0?1")
    @Max(value = 1, message = "?????0?1")
    private Integer status;

    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
}
