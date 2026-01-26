# 硬件端 API 文档

> 本文档面向硬件开发人员，描述硬件设备如何与日志管理系统交互。

---

## 概述

硬件只需使用 **一个接口** 即可将日志数据上报到服务器：

| 方法 | 接口           | 描述         |
| ---- | -------------- | ------------ |
| POST | `/api/v1/logs` | 上报日志记录 |

---

## 接口详情

### POST /api/v1/logs

**创建日志记录**

硬件设备调用此接口上报日志、警告或错误信息。

#### 请求

**Headers**

```
Content-Type: application/json
```

**Body 参数**

| 字段          | 类型   | 必填  | 说明                                           |
| ------------- | ------ | ----- | ---------------------------------------------- |
| `deviceUuid`  | string | ✅ 是 | 设备唯一标识，必须是 UUID v4 格式              |
| `projectId`   | number | ✅ 是 | 项目 ID（整数），用于区分不同项目              |
| `timestamp`   | number | ✅ 是 | 客户端调用时间戳（Unix 毫秒时间戳）            |
| `signature`   | string | ✅ 是 | 签名，用于验证请求合法性（详见签名算法）       |
| `dataType`    | string | ✅ 是 | 数据类型，可选值：`record`、`warning`、`error` |
| `key`         | string | ✅ 是 | 日志键名，最大 255 字符                        |
| `value`       | object | ✅ 是 | 日志内容，必须是 JSON 对象                     |
| `sessionUuid` | string | ✅ 是 | 会话标识（本次 App 运行的 UUID），UUID v4 格式 |

**dataType 说明**

- `record` - 普通记录（日常运行数据）
- `warning` - 警告信息（需关注但不紧急）
- `error` - 错误信息（需要处理的异常）

---

## 签名算法

客户端需使用 **HMAC-SHA256** 算法生成签名，服务器将使用相同算法验证请求合法性。

### 签名步骤

1. **获取认证 Key**：从脚本配置中获取 `authKey`（即项目密钥，由管理员分配）。**注意：`authKey` 仅用于计算签名，绝不能包含在请求体中传输。**
2. **构建签名字符串**：按固定顺序拼接请求参数。
3. **计算签名**：使用 JSON 紧凑格式（无空格）的 `value` 字段，并使用 `authKey` 作为密钥进行 HMAC-SHA256 计算。

### 签名字符串格式

```
{projectId}:{deviceUuid}:{timestamp}:{dataType}:{key}:{valueJson}
```

其中 `valueJson` 是 `value` 字段的 **紧凑 JSON 字符串**（无空格、无换行）。

### 签名计算

```
signature = HMAC-SHA256(authKey, signString).toLowerCase()
```

### 签名示例

假设：

- `authKey` = `"sk_abc123xyz"`（仅作为密钥，不传输）
- `projectId` = `1001`
- `deviceUuid` = `"550e8400-e29b-41d4-a716-446655440000"`
- `timestamp` = `1737871200000`
- `dataType` = `"record"`
- `key` = `"temperature"`
- `value` = `{"temp": 25.5}`

**Step 1: 构建签名字符串**

```
1001:550e8400-e29b-41d4-a716-446655440000:1737871200000:record:temperature:{"temp":25.5}
```

**Step 2: 计算 HMAC-SHA256**

密钥为 `"sk_abc123xyz"`，对上述字符串进行 HMAC-SHA256 计算：

```
signature = "a1b2c3d4e5f6..." (64位小写十六进制字符串)
```

---

## 请求示例

```json
{
  "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": 1001,
  "timestamp": 1737871200000,
  "signature": "a1b2c3d4e5f6...",
  "sessionUuid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "dataType": "record",
  "key": "temperature_reading",
  "value": {
    "temperature": 25.5,
    "humidity": 60
  }
}
```

---

## 响应

**成功响应 (201 Created)**

```json
{
  "id": 12345,
  "deviceUuid": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": 1001,
  "sessionUuid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "clientIp": "192.168.1.100",
  "dataType": "record",
  "key": "temperature_reading",
  "value": {
    "temperature": 25.5,
    "humidity": 60
  },
  "createdAt": "2026-01-26T12:00:05.123Z"
}
```

**签名验证失败 (401 Unauthorized)**

```json
{
  "error": {
    "code": "SIGNATURE_ERROR",
    "message": "签名验证失败"
  }
}
```

**时间戳过期 (400 Bad Request)**

```json
{
  "error": {
    "code": "TIMESTAMP_ERROR",
    "message": "时间戳无效或已过期（允许误差 5 分钟）"
  }
}
```

---

## 代码示例

### Python (MicroPython / ESP32)

```python
import urequests
import ujson
import time
import hmac
import hashlib

AUTH_KEY = "sk_abc123xyz"  # 从脚本配置获取，不传输
PROJECT_ID = 1001          # 项目 ID

def generate_signature(project_id, device_uuid, timestamp, auth_key, data_type, key, value):
    """生成 HMAC-SHA256 签名"""
    value_json = ujson.dumps(value, separators=(',', ':'))
    # 签名字符串
    sign_string = f"{project_id}:{device_uuid}:{timestamp}:{data_type}:{key}:{value_json}"
    signature = hmac.new(
        auth_key.encode('utf-8'),
        sign_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return signature

def send_log(device_uuid, data_type, key, value):
    url = "https://your-server.com/api/v1/logs"
    headers = {"Content-Type": "application/json"}
    timestamp = int(time.time() * 1000)

    signature = generate_signature(PROJECT_ID, device_uuid, timestamp, AUTH_KEY, data_type, key, value)

    payload = {
        "deviceUuid": device_uuid,
        "projectId": PROJECT_ID,
        # "authKey": AUTH_KEY,  <-- 注意：不要传输 authKey
        "timestamp": timestamp,
        "signature": signature,
        "dataType": data_type,
        "key": key,
        "value": value,
        "sessionUuid": "..." # 实际使用时应传入真实 sessionUuid
    }

    try:
        response = urequests.post(url, json=payload, headers=headers)
        if response.status_code == 201:
            print("日志上报成功")
        else:
            print(f"上报失败: {response.text}")
        response.close()
    except Exception as e:
        print(f"请求异常: {e}")
```

### C/C++ (使用 OpenSSL)

```c
#include <curl/curl.h>
#include <openssl/hmac.h>
#include <string.h>
#include <stdio.h>
#include <time.h>

const char* AUTH_KEY = "sk_abc123xyz";
const int PROJECT_ID = 1001;

void hmac_sha256(const char* key, const char* data, char* output) {
    unsigned char hash[32];
    unsigned int len = 32;

    HMAC(EVP_sha256(), key, strlen(key),
         (unsigned char*)data, strlen(data), hash, &len);

    for (int i = 0; i < 32; i++) {
        sprintf(output + (i * 2), "%02x", hash[i]);
    }
    output[64] = '\0';
}

void send_log(const char* device_uuid, const char* data_type,
              const char* key, const char* value_json) {
    CURL *curl;
    long long timestamp = (long long)time(NULL) * 1000;

    // 构建签名字符串
    char sign_string[2048];
    snprintf(sign_string, sizeof(sign_string), "%d:%s:%lld:%s:%s:%s",
             PROJECT_ID, device_uuid, timestamp, data_type, key, value_json);

    // 计算签名 (使用 AUTH_KEY 作为密钥)
    char signature[65];
    hmac_sha256(AUTH_KEY, sign_string, signature);

    // 构建 JSON body (不包含 AUTH_KEY)
    char json_body[4096];
    snprintf(json_body, sizeof(json_body),
        "{\"deviceUuid\":\"%s\",\"projectId\":%d,\"timestamp\":%lld,"
        "\"signature\":\"%s\",\"dataType\":\"%s\",\"key\":\"%s\",\"value\":%s,"
        "\"sessionUuid\":\"...\"}",
        device_uuid, PROJECT_ID, timestamp, signature, data_type, key, value_json);

    // ... 发送逻辑同前 ...
}
```

### Arduino (ESP32)

```cpp
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <mbedtls/md.h>

const char* AUTH_KEY = "sk_abc123xyz";
const int PROJECT_ID = 1001;

// ... hmacSha256 函数同前 ...

void sendLog(String deviceUuid, String dataType, String key, JsonObject& value) {
    if (WiFi.status() != WL_CONNECTED) return;

    unsigned long long timestamp = (unsigned long long)time(nullptr) * 1000;

    String valueJson;
    serializeJson(value, valueJson);

    // 签名字符串
    String signString = String(PROJECT_ID) + ":" + deviceUuid + ":" +
                        String(timestamp) + ":" + dataType + ":" + key + ":" + valueJson;

    // 计算签名
    String signature = hmacSha256(AUTH_KEY, signString);

    StaticJsonDocument<1024> doc;
    doc["deviceUuid"] = deviceUuid;
    doc["projectId"] = PROJECT_ID;
    // doc["authKey"] = AUTH_KEY; // 不要传输
    doc["timestamp"] = timestamp;
    doc["signature"] = signature;
    doc["dataType"] = dataType;
    doc["key"] = key;
    doc["value"] = value;
    doc["sessionUuid"] = "...";

    // ... 发送逻辑同前 ...
}
```

---

## 限流说明

| 限制类型 | 限制                          |
| -------- | ----------------------------- |
| 请求频率 | 每个 IP 每分钟最多 100 次请求 |

---

## 注意事项

1. **密钥安全**：`authKey` 是项目的核心凭证，绝不应包含在请求体中传输，仅用于本地计算签名。
2. **时间同步**：设备必须保持与 NTP 服务器的时间同步，时间戳偏差超过 5 分钟将导致验证失败。
3. **JSON 格式**：签名时 `value` 必须序列化为紧凑格式（无空格、无换行），且与传输的 Body 内容一致。
4. **Signature 计算**：HMAC-SHA256 的密钥是 `authKey`，签名字符串中不需要再包含 `authKey`。
