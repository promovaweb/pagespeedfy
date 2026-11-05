/** Configuração da suíte do Pagespeedfy: testes isolados, sem rede. */
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { testTimeout: 20000, hookTimeout: 20000 },
});
