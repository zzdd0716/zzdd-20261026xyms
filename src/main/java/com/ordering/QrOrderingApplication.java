package com.ordering;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 二维码点餐系统启动类
 *
 * @author qr-ordering
 */
@SpringBootApplication
@MapperScan("com.ordering.mapper")
public class QrOrderingApplication {

    public static void main(String[] args) {
        SpringApplication.run(QrOrderingApplication.class, args);
        System.out.println("二维码点餐系统启动成功!");
    }
}
