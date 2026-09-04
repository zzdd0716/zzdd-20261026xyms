package com.ordering.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI 文档配置
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI xymsOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("二维码点餐系统接口文档")
                        .description("首期功能：顾客扫码点餐 + 后厨接单 + 商家管菜品\n\n"
                                + "统一返回结构：Result{code, message, data}，code=200 表示成功\n"
                                + "订单状态：0待支付 1已支付待制作 2制作中 3已上菜 4已完成 5已取消 6已退款")
                        .version("v1.0")
                        .contact(new Contact().name("xyms")));
    }
}
