/** La IA está activa solo si se configuró la clave de Anthropic. */
export function isAiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
