package com.ordering.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.ordering.common.result.Result;
import com.ordering.entity.User;
import com.ordering.mapper.UserMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 用户接口：小程序端登录（openid 换 userId）
 *
 * 说明：小程序端在本地生成一个持久化的 openid（首次启动生成并缓存），
 * 调用本接口注册/查询用户，拿到数据库 userId 后用于"我的订单"过滤。
 * 后续接入微信登录时，只需把 openid 换成 wx.login 换取的真实 openid，逻辑不变。
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "用户", description = "小程序登录：openid 换 userId")
public class UserController {

    private final UserMapper userMapper;

    /** 登录：按 openid 查用户，不存在则创建，返回 userId */
    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "传入 openid，已存在则直接返回 userId，不存在则自动注册并返回新 userId")
    public Result<Long> login(@RequestBody Map<String, String> body) {
        String openid = body == null ? null : body.get("openid");
        if (openid == null || openid.isBlank()) {
            return Result.error("openid不能为空");
        }
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getOpenid, openid).last("LIMIT 1"));
        if (user == null) {
            user = new User();
            user.setOpenid(openid);
            user.setNickname("微信用户");
            user.setStatus(1);
            user.setCreateTime(LocalDateTime.now());
            user.setUpdateTime(LocalDateTime.now());
            userMapper.insert(user);
        }
        return Result.success(user.getId());
    }
}
