// ================================================================
// TEXTOS DO ATENDENTE VIRTUAL - WHATSAPP MICROCAD
// Para alterar qualquer resposta, edite este arquivo e faca o
// commit (o deploy pelo GitHub Actions publica sozinho).
// ================================================================

const SAUDACAO = `Microcad - TOPOCAD2000
Agradecemos seu contato.

Responda com o NÚMERO da opção:

1 - COMERCIAL
2 - SUPORTE (só por e-mail)
3 - ADQUIRIR NOVA
4 - INFORMAÇÕES
5 - ADQUIRIR ATUALIZAÇÃO
6 - TESTAR POR 30 DIAS
7 - COMPATIBILIDADE
8 - LISTA DE ATUALIZAÇÕES
9 - VIDEOAULAS E CURSOS
10 - OUTROS CONTATOS
11 - OUTROS ASSUNTOS (deixar mensagem)

Atendimento 24h por este canal.
Para voltar a este menu, digite MENU.
Não envie áudios nem chamadas: não são reconhecidos neste canal.`;

const RESPOSTAS = {
   "1": `TOPOCAD2000 V21

De R$ 830,00 por R$ 625,00 à vista no PIX ou boleto, ou em até 10x no cartão de crédito sem juros.

Licença vitalícia para a versão adquirida, atualizações gratuitas enquanto for a versão atual e suporte por e-mail ilimitado.

Loja virtual, aberta 24 horas:
https://www.amicrocad.com.br/topocad2000/lojavirtual

Dúvidas sobre nota fiscal, forma de pagamento ou licenciamento, responda por aqui.`,

   "2": `O suporte técnico do TOPOCAD2000 é feito exclusivamente por e-mail, para que sua solicitação fique registrada e seja respondida com o histórico completo.

Envie para: contato@topocad2000.com.br

Informe no e-mail:
- Nome e empresa
- Número de série / licença
- Versão do TOPOCAD2000
- Qual CAD e versão (AutoCAD, BricsCAD, GstarCAD ou ZWCAD)
- Descrição do problema
- Print da tela do erro

Com esses dados a resposta sai bem mais rápido.

Antes, confira nossas vídeo aulas - a maioria das dúvidas está respondida nelas:
- No site www.topocad2000.com.br > VIDEO AULAS
- Dentro do programa, cada comando tem um botão VÍDEO com as aulas daquele comando`,

   "3": `A compra é concluída na hora pela loja virtual, aberta 24 horas:

https://www.amicrocad.com.br/topocad2000/lojavirtual

TOPOCAD2000 V21 - de R$ 830,00 por R$ 625,00 à vista no PIX ou boleto, ou em até 10x no cartão sem juros.

Após a confirmação do pagamento você recebe os dados de instalação e o registro da licença.

Qualquer dificuldade no processo, responda por aqui.`,

   "4": `TOPOCAD2000 V21

De R$ 830,00 por R$ 625,00 à vista no PIX ou boleto, ou em até 10x no cartão sem juros.

Loja virtual 24h:
https://www.amicrocad.com.br/topocad2000/lojavirtual

COMPATIBILIDADE
- AutoCAD e AutoCAD C3D: 2007, 2010 ao 2027 (AutoCAD LT: não compatível)
- BricsCAD: 2020 ao 2026 (Pro) - Lite: não compatível
- GstarCAD: 2020 ao 2027 (Professional, Standard e LT)
- ZWCAD: 2020 ao 2027 (Professional) - Standard: não compatível

LICENCIAMENTO
- Pessoa física (CPF): instalação em até 3 micros para uso próprio, não simultâneo.
- Sem limite de instalações, apenas de micros habilitados. O próprio usuário remove instalações não utilizadas pelo GERENCIADOR DE INSTALAÇÕES, no menu TOPOCAD2000V - MICROCAD.

INCLUI
- Licença vitalícia para a versão adquirida
- Atualizações gratuitas enquanto for a versão atual
- Acesso remoto para resolução de problemas: 1 ano
- Suporte por e-mail: ilimitado
- Garantia geral: 1 ano`,

   "5": `Atualização para o TOPOCAD2000 V21

- V20 para V21: de R$ 415,00 por R$ 400,00
- V19 para V21: de R$ 500,00 por R$ 450,00
- Demais versões para V21: de R$ 600,00 por R$ 500,00

À vista no PIX ou boleto, ou em até 10x no cartão de crédito sem juros.

Verifique sua versão e compre a atualização direto por aqui, 24 horas:
https://www.amicrocad.com.br/topocad2000/verificar-versao

Se tiver dúvida sobre qual versão você usa, responda por aqui informando o número de série.`,

   "6": `Teste o TOPOCAD2000 V21 gratuitamente por 30 dias.

Versão completa, sem limitação de funções e sem cadastro. Ao final dos 30 dias o programa para de funcionar, e para continuar usando basta adquirir a licença.

Download direto:
https://www.topocad2000.com.br/downloads/TOPOCAD2000V21.exe

Vídeo de instalação:
https://youtu.be/JNJnq9kztkc

Dentro do programa, cada comando tem um botão VÍDEO que abre as videoaulas daquele comando.

Confira antes a compatibilidade com seu CAD respondendo 7.`,

   "7": `Topocad2000 V21 Compatível com:
AutoCADs e AutoCAD C3D: 2007, 2010 ao 2027 / AutoCAD LT: Não compatível
BricsCADs: 2020 ao 2026 (Pro) / Lite: Não compatível
GstarCADs: 2020 ao 2027 (Professional, Standard e LT)
ZWCADs: 2020 ao 2027 (Professional) / Standard: Não compatível`,

   "8": `Lista completa de atualizações do TOPOCAD2000:

https://www.topocad2000.com.br/downloads/TOPOCAD2000.TXT`,

   "9": `VIDEOAULAS E CURSOS

A maioria das dúvidas está respondida nas videoaulas:

- No site www.topocad2000.com.br > VIDEO AULAS
- Dentro do programa, cada comando tem um botão VÍDEO com as aulas daquele comando

No site você também encontra CURSOS / TREINAMENTOS.

Para voltar ao menu, digite MENU.`,

   "10": `OUTROS CONTATOS

SUPORTE (24h, todos os dias, só por e-mail):
contato@topocad2000.com.br

COMERCIAL (horário comercial, segunda a sexta, das 9h às 18h):
(21) 2717-4559

Para voltar ao menu, digite MENU.`,

   "11": `Certo. Descreva sua solicitação em uma mensagem que retornaremos no horário de atendimento: segunda a sexta, das 9h às 18h.`
};

// Confirmacao enviada quando o cliente descreve a solicitacao da opcao 11
const RECEBIDO_OUTROS = `Recebido! Sua mensagem foi encaminhada e retornaremos no horário de atendimento: segunda a sexta, das 9h às 18h.

Para outras opções, digite MENU.`;

const PADRAO = `Não identifiquei sua opção.

Responda apenas com o NÚMERO de uma das opções do menu (1 a 11), ou digite MENU para ver as opções novamente.`;

const AGRADECIMENTO = `Agradecemos por utilizar nossos serviços! Esperamos trabalhar com você novamente em breve.`;

// ================================================================
// IA (FASE 2) - usada so quando o cliente escreve texto livre que
// nao corresponde a nenhuma opcao nem palavra-chave.
// A IA responde APENAS com base nos textos deste arquivo:
// IA_SOBRE + menu + todas as RESPOSTAS acima.
// Para ensinar algo novo a IA, acrescente em IA_SOBRE.
// ================================================================

const IA_SOBRE = `SOBRE A MICROCAD E O TOPOCAD2000
- MICROCAD Computação Gráfica, Niterói/RJ. Mais de 26 anos no mercado e mais de 10.000 usuários.
- O TOPOCAD2000 V21 é um software de topografia que funciona dentro do CAD (AutoCAD, BricsCAD, GstarCAD ou ZWCAD).
- Principais recursos:
  - Memorial descritivo: SIGEF, INCRA, cartório e lotes, com mais de 100 modelos em Word e LibreOffice.
  - Google Earth: exporta e importa o levantamento com um clique (KML).
  - CONFRO2000: parcelas do SIGEF, SICAR e SNCI pelo código, e RI Digital (ONR).
  - Curvas de nível, declividade, mapa de cotas, perfis e divisão de áreas.
  - Coletores GNSS: HI-TARGET, TRIMBLE, SATLAB, LANDSTAR, SOUTH, COMNAV e outros.
- Licença vitalícia para a versão adquirida, sem mensalidade.
- Entrega por e-mail, com proteção de uso virtual ou por PendriveLock (opcional).
- Pessoa física (CPF): instalação em até 3 micros para uso próprio, não simultâneo.
- Pessoa jurídica (CNPJ): instalação em 1 micro, para uso de qualquer pessoa da empresa.
- Garantia geral de 1 ano. Suporte ilimitado por e-mail, 24h todos os dias.
- Site: www.topocad2000.com.br (videoaulas, downloads, grupos de WhatsApp, parcerias, revendas, cursos e treinamentos).`;

const IA_REGRAS = `Você é o atendente virtual do WhatsApp comercial da MICROCAD (software TOPOCAD2000).

REGRAS OBRIGATÓRIAS:
- Responda em português do Brasil, de forma curta, cordial e objetiva (de preferência até 6 linhas).
- Use SOMENTE as informações da BASE abaixo. Nunca invente preços, descontos, prazos, funcionalidades, versões ou condições.
- Suporte técnico (erros, instalação, problemas de uso) é feito exclusivamente por e-mail: contato@topocad2000.com.br. Não tente resolver problemas técnicos; oriente a enviar o e-mail e a ver as videoaulas (opção 9).
- Dúvidas sobre como usar um comando específico: indique as videoaulas (opção 9) e o suporte por e-mail.
- Quando a resposta estiver em uma opção do menu, indique o número (ex.: "digite 6 para o link de download").
- Se a BASE não tiver a informação, diga que não tem essa informação aqui e sugira digitar 11 para deixar a mensagem (retorno de segunda a sexta, das 9h às 18h).
- Não converse sobre assuntos que não sejam da MICROCAD e dos seus produtos.
- Nunca peça senhas, dados de cartão ou documentos.
- Se perguntarem se você é uma pessoa, diga que é o atendente virtual automático da Microcad.
- Formatação de WhatsApp: texto simples; para destacar use *asterisco*. Não use títulos com #, tabelas nem links em markdown.
- Quando fizer sentido, termine com: "Para ver as opções, digite MENU."`;

export default {
   SAUDACAO, RESPOSTAS, RECEBIDO_OUTROS, PADRAO, AGRADECIMENTO,
   IA_SOBRE, IA_REGRAS
};
