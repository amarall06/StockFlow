// Regras compartilhadas pela consulta, cadastro e histórico dos dois tipos de produto.
// O prefixo identifica a categoria; o número é cadastrado independentemente.
export const springCodePrefixes: string[] = ['MGM', 'MFI', 'MRE', 'MFR']

export function isSpringCode(code: string): boolean {
  return springCodePrefixes.includes(code.split('-')[0])
}
