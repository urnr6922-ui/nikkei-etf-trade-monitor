# JARVIS

スマートフォン向けAIアシスタントの別プロジェクト設計。

## 目標
- Android / iPhone を対象
- オンライン + オフラインのハイブリッド構成
- 音声入力・音声応答
- 画面認識
- ユーザーの明示的な許可のもとで端末操作
- AndroidではAccessibilityServiceを用途と権限の範囲内で利用
- iPhoneではApp Intents / Shortcuts / Siri連携を中心にする

## 開発段階
1. 音声入出力
2. 指示解析
3. 画面認識
4. 操作確認UI
5. Android操作基盤
6. iPhone App Intents連携
7. オフライン機能
8. 実機テスト

## 注意
日経ETF Trade Monitorとは別プロジェクトとして管理する。
安全のため、端末操作はユーザーの明示的な許可を前提とする。
