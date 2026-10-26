package com.ordering.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.ai.entity.AiConfig;
import com.ordering.ai.mapper.AiConfigMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AI 功能配置服务（开关管理）
 */
@Service
@RequiredArgsConstructor
public class AiConfigService {

    private final AiConfigMapper aiConfigMapper;

    /** 查门店所有AI开关配置 */
    public Map<String, Boolean> listConfig(Long shopId) {
        List<AiConfig> list = aiConfigMapper.selectList(
                new LambdaQueryWrapper<AiConfig>().eq(AiConfig::getShopId, shopId)
        );
        Map<String, Boolean> result = new HashMap<>();
        for (AiConfig c : list) {
            result.put(c.getConfigKey(), "true".equalsIgnoreCase(c.getConfigValue()));
        }
        // 默认值：没配置就默认开启
        result.putIfAbsent("ai_recommend_enabled", true);
        result.putIfAbsent("ai_chat_enabled", true);
        return result;
    }

    /** 修改某个开关 */
    public void updateConfig(Long shopId, String key, boolean value) {
        AiConfig config = aiConfigMapper.selectOne(
                new LambdaQueryWrapper<AiConfig>()
                        .eq(AiConfig::getShopId, shopId)
                        .eq(AiConfig::getConfigKey, key)
        );
        if (config == null) {
            config = new AiConfig();
            config.setShopId(shopId);
            config.setConfigKey(key);
            config.setConfigValue(String.valueOf(value));
            aiConfigMapper.insert(config);
        } else {
            config.setConfigValue(String.valueOf(value));
            aiConfigMapper.updateById(config);
        }
    }

    /** 判断某个功能是否开启 */
    public boolean isEnabled(Long shopId, String key) {
        Map<String, Boolean> config = listConfig(shopId);
        return config.getOrDefault(key, true);
    }
}
