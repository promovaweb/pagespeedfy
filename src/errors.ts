/**
 * Erro de uso ou de operação apresentado ao usuário sem stack trace.
 *
 * O `codigoSaida` vira o exit code do processo: 1 para falhas de operação,
 * 2 para uso incorreto de argumentos.
 */
export class CliError extends Error {
  readonly codigoSaida: number;

  constructor(mensagem: string, codigoSaida = 1, opcoes?: ErrorOptions) {
    super(mensagem, opcoes);
    this.name = "CliError";
    this.codigoSaida = codigoSaida;
  }
}
