#!/usr/bin/env node
/**
 * Ponto de entrada publicado no npm. Carrega o build JavaScript e executa o
 * CLI com os argumentos do processo.
 */
import { executar } from "../dist/cli.js";

await executar();
