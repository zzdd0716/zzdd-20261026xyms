package com.ordering.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 功能配置（开关）
 */
@Data
@TableName("ai_config")
public class AiConfig {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long shopId;

    /** 配置项 key：ai_recommend_enabled / ai_chat_enabled */
    private String configKey;

    /** 配置值：true / false */
    private String configValue;

    private LocalDateTime updateTime;
}
