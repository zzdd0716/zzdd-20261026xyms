package com.ordering.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC 配置：为商家管理后台做路径转发。
 * 访问 /admin 或 /admin/ 时直接展示后台首页 index.html。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // /admin 与 /admin/ 均转发到静态首页（商家管理后台）
        registry.addViewController("/admin").setViewName("forward:/admin/index.html");
        registry.addViewController("/admin/").setViewName("forward:/admin/index.html");
        // /customer 与 /customer/ 转发到静态首页（顾客扫码点餐端）
        registry.addViewController("/customer").setViewName("forward:/customer/index.html");
        registry.addViewController("/customer/").setViewName("forward:/customer/index.html");
    }
}
