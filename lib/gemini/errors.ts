/**
 * Gemini API エラーハンドリング
 */

export class GeminiError extends Error {
  public readonly status: number;
  public readonly geminiMessage: string;

  constructor(status: number, message: string) {
    super(`Gemini API Error (${status}): ${message}`);
    this.name = "GeminiError";
    this.status = status;
    this.geminiMessage = message;
  }

  toUserMessage(): string {
    switch (this.status) {
      case 400:
        return `リクエストエラー: ${this.geminiMessage}`;
      case 401:
      case 403:
        return (
          "Gemini API Key が無効です。" +
          "https://aistudio.google.com/apikey で API Key を確認してください。"
        );
      case 429:
        return (
          "Gemini API のレート制限に達しました。" +
          "しばらく待ってから再試行してください。"
        );
      default:
        if (this.status >= 500) {
          return "Gemini API 側でエラーが発生しました。しばらく待ってから再試行してください。";
        }
        return `Gemini API エラー: ${this.geminiMessage}`;
    }
  }
}
