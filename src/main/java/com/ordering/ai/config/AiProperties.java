package com.ordering.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI 功能配置
 * 在 application.yml 里配置 ai.enabled / ai.api-key / ai.model
 */
@Data
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    /** AI 功能总开关：false 时接口直接返回"未开启" */
    private boolean enabled = false;

    /** 豆包大模型 API Key（火山引擎控制台申请） */
    private String apiKey = "";

    /** 豆包 API 地址（默认兼容 OpenAI 格式） */
    private String apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    /** 模型名称（接入点 ID） */
    private String model = "";

    /** 只从这些分类里推荐（分类名称，逗号分隔），留空则全菜单推荐 */
    private String recommendCategories = "主食,汤粉,汤饭,例汤";
}
