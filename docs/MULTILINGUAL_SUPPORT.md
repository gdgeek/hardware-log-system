# 多语言支持文档

## 概述

Session.html 页面现在支持三种语言：
- 🇨🇳 简体中文 (zh-CN) - 默认语言
- 🇹🇼 繁体中文 (zh-TW)
- 🇬🇧 英文 (en)

## 使用方法

### 通过 URL 参数指定语言

在 URL 中添加 `lang` 参数来指定页面语言：

```
# 简体中文（默认）
http://localhost:3000/session.html?lang=zh-CN

# 繁体中文
http://localhost:3000/session.html?lang=zh-TW

# 英文
http://localhost:3000/session.html?lang=en
```

### 与其他参数组合使用

可以与 `projectId` 参数组合使用：

```
# 项目1 + 英文
http://localhost:3000/session.html?projectId=1&lang=en

# 项目1 + 繁体中文
http://localhost:3000/session.html?projectId=1&lang=zh-TW
```

### 使用页面语言选择器

页面右上角有语言选择器，可以直接点击切换语言：
- **简体** - 切换到简体中文
- **繁體** - 切换到繁体中文
- **EN** - 切换到英文

切换语言后，URL 会自动更新，刷新页面仍然保持选择的语言。

## 翻译内容

以下内容已完全翻译：

### 页面元素
- ✅ 页面标题
- ✅ 主标题和副标题
- ✅ 所有表单标签（项目ID、开始日期、结束日期）
- ✅ 所有按钮（生成报表、日期快捷按钮、导出按钮）
- ✅ 统计卡片（会话数量、数据类型、总记录数）
- ✅ 表格表头（会话索引、启动时间、会话UUID）

### 提示信息
- ✅ 错误提示标题
- ✅ 验证失败提示
- ✅ 项目不存在提示
- ✅ 加载中提示
- ✅ 空数据提示

### 密码认证对话框
- ✅ 对话框标题
- ✅ 提示文本
- ✅ 输入框标签和占位符
- ✅ 按钮文本（取消、验证）
- ✅ 错误提示

### 导出功能
- ✅ 导出按钮文本
- ✅ 合并按钮文本
- ✅ Excel 表头翻译
- ✅ 导出提示信息

## 技术实现

### 文件结构

```
public/
├── js/
│   ├── i18n.js          # 国际化支持核心文件
│   └── session.js       # 页面逻辑（已集成多语言）
└── session.html         # 页面HTML（添加data-i18n属性）
```

### 核心函数

#### `initLanguage()`
初始化语言设置，从 URL 参数读取语言代码。

#### `t(key, lang)`
获取翻译文本的核心函数。

```javascript
// 使用示例
const title = t('mainTitle');  // 返回当前语言的标题
const error = t('error');      // 返回当前语言的"错误："文本
```

#### `switchLanguage(lang)`
切换页面语言。

```javascript
// 切换到英文
switchLanguage('en');

// 切换到繁体中文
switchLanguage('zh-TW');
```

#### `updatePageTranslations()`
更新页面上所有翻译内容。

### HTML 属性

使用 `data-i18n` 属性标记需要翻译的元素：

```html
<!-- 文本内容翻译 -->
<span data-i18n="mainTitle">项目整理报表</span>

<!-- 占位符翻译 -->
<input data-i18n-placeholder="enterPassword" placeholder="请输入项目密码">

<!-- HTML 内容翻译 -->
<div data-i18n-html="projectInfo"></div>
```

## 添加新语言

### 1. 在 i18n.js 中添加翻译

```javascript
const translations = {
  // ... 现有语言
  
  'ja': {  // 日文示例
    pageTitle: 'プロジェクト整理レポート',
    mainTitle: 'プロジェクト整理レポート',
    // ... 其他翻译
  }
};
```

### 2. 在语言选择器中添加按钮

```html
<button type="button" class="btn btn-sm btn-outline-light" 
        onclick="switchLanguage('ja')" title="日本語">
  JP
</button>
```

## 默认行为

- 如果 URL 中没有 `lang` 参数，默认使用简体中文 (zh-CN)
- 如果 `lang` 参数无效，也会使用简体中文
- 语言选择会保存到 URL 中，刷新页面保持选择

## 浏览器兼容性

- ✅ Chrome/Edge (最新版本)
- ✅ Firefox (最新版本)
- ✅ Safari (最新版本)
- ✅ 移动端浏览器

## 注意事项

1. **URL 参数优先级**：URL 中的 `lang` 参数优先级最高
2. **语言代码大小写**：语言代码区分大小写，必须使用正确的格式（zh-CN, zh-TW, en）
3. **刷新保持**：切换语言后刷新页面，语言设置会保持
4. **动态内容**：JavaScript 动态生成的内容也会使用 `t()` 函数进行翻译

## 示例

### 完整 URL 示例

```bash
# 简体中文 + 项目1
http://localhost:3000/session.html?projectId=1&lang=zh-CN

# 繁体中文 + 项目1
http://localhost:3000/session.html?projectId=1&lang=zh-TW

# 英文 + 项目1
http://localhost:3000/session.html?projectId=1&lang=en

# 默认语言（简体中文）
http://localhost:3000/session.html?projectId=1
```

### 生产环境示例

```bash
# 简体中文
https://log.voxel.cn/session.html?projectId=1&lang=zh-CN

# 繁体中文
https://log.voxel.cn/session.html?projectId=1&lang=zh-TW

# 英文
https://log.voxel.cn/session.html?projectId=1&lang=en
```

## 维护建议

1. **添加新文本时**：确保在所有三种语言中都添加对应的翻译
2. **测试**：每次修改后测试所有三种语言
3. **一致性**：保持翻译风格和术语的一致性
4. **文档更新**：添加新功能时更新此文档

## 常见问题

### Q: 如何添加新的翻译文本？
A: 在 `public/js/i18n.js` 的 `translations` 对象中为所有语言添加新的键值对。

### Q: 为什么切换语言后某些文本没有变化？
A: 检查该元素是否添加了 `data-i18n` 属性，或者在 JavaScript 中是否使用了 `t()` 函数。

### Q: 如何设置默认语言为英文？
A: 修改 `i18n.js` 中 `initLanguage()` 函数的默认值：
```javascript
currentLang = 'en';  // 改为 'en'
```

### Q: 语言选择器按钮没有高亮当前语言？
A: 确保调用了 `updateLanguageSelectorButtons()` 函数，该函数会在 `updatePageTranslations()` 中自动调用。
