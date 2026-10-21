// ================================================================
// TEXTOS DO ATENDENTE VIRTUAL - WHATSAPP MICROCAD
// Para alterar qualquer resposta, edite este arquivo e faca o
// commit (o deploy pelo GitHub Actions publica sozinho).
// ================================================================

const SAUDACAO = `Microcad - TOPOCAD2000
Agradecemos seu contato.

Responda com o NÚMERO da opção:

1 - COMERCIAL
2 - SUPORTE 24H (só por e-mail)
3 - ADQUIRIR NOVA
4 - INFORMAÇÕES
5 - ADQUIRIR ATUALIZAÇÃO
6 - TESTAR POR 30 DIAS
7 - COMPATIBILIDADE
8 - LISTA DE ATUALIZAÇÕES
9 - VIDEOAULAS
10 - CURSOS (EMPRESAS PARCEIRAS)
11 - OUTROS CONTATOS
12 - OUTROS ASSUNTOS (deixar mensagem)

Atendimento 24h por este canal.
Para voltar a este menu, digite MENU.
Não envie áudios nem chamadas: não são reconhecidos neste canal.`;

const RESPOSTAS = {
   "1": `TOPOCAD2000 V21

De R$ 830,00 por R$ 625,00.

À vista no PIX ou boleto, ou no cartão em até 10x sem juros.
Na loja virtual, para mais de 3x escolha *Mercado Pago* na tela de pagamento (a primeira opção, do próprio site, vai só até 3x).
No Mercado Livre, até 10x sem juros:
https://www.mercadolivre.com.br/topocad2000-v21--microcad-envio-por-email/up/MLBU3881792188

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

TOPOCAD2000 V21 - de R$ 830,00 por R$ 625,00.

À vista no PIX ou boleto, ou no cartão em até 10x sem juros.
Na loja virtual, para mais de 3x escolha *Mercado Pago* na tela de pagamento (a primeira opção, do próprio site, vai só até 3x).
No Mercado Livre, até 10x sem juros:
https://www.mercadolivre.com.br/topocad2000-v21--microcad-envio-por-email/up/MLBU3881792188

Após a confirmação do pagamento você recebe os dados de instalação e o registro da licença.

Qualquer dificuldade no processo, responda por aqui.`,

   "4": `TOPOCAD2000 V21

De R$ 830,00 por R$ 625,00.

À vista no PIX ou boleto, ou no cartão em até 10x sem juros.
Na loja virtual, para mais de 3x escolha *Mercado Pago* na tela de pagamento (a primeira opção, do próprio site, vai só até 3x).
No Mercado Livre, até 10x sem juros:
https://www.mercadolivre.com.br/topocad2000-v21--microcad-envio-por-email/up/MLBU3881792188

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

À vista no PIX ou boleto, ou no cartão em até 10x sem juros.
Na loja virtual, para mais de 3x escolha *Mercado Pago* na tela de pagamento (a primeira opção, do próprio site, vai só até 3x).

Verifique sua versão e compre a atualização direto por aqui, 24 horas:
https://www.amicrocad.com.br/topocad2000/verificar-versao

Não sabe seu número de série? Receba por e-mail informando o CPF/CNPJ e o e-mail do cadastro:
https://microcad.azurewebsites.net/envianserie

Se tiver dúvida sobre qual versão você usa, responda por aqui informando o número de série.

Se você só quer a última atualização da sua versão, sem mudar para a V21: www.topocad2000.com.br > DOWNLOADS (V15 a V21), ou no programa, ícone M > tela MICROCAD - BR > botão VERIFICAR ATUALIZAÇÕES.`,

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

   "8": `LISTA DE ATUALIZAÇÕES

Lista completa de atualizações do TOPOCAD2000:
https://www.topocad2000.com.br/downloads/TOPOCAD2000.TXT

Para instalar a última atualização da sua versão (V15 a V21):
- No site: www.topocad2000.com.br > DOWNLOADS
https://www.amicrocad.com.br/topocad2000-download
- Ou no programa: ícone M > tela MICROCAD - BR > botão VERIFICAR ATUALIZAÇÕES

Para mudar para a V21, digite 5.`,

   "9": `VIDEOAULAS

A maioria das dúvidas está respondida nas videoaulas gratuitas:

- No site: https://www.amicrocad.com.br/topocad2000-videoaulas
- Dentro do programa, cada comando tem um botão VÍDEO com as aulas daquele comando

Para voltar ao menu, digite MENU.`,

   "10": `CURSOS (EMPRESAS PARCEIRAS)

A Microcad não oferece cursos.
Cursos de topografia, georreferenciamento e GNSS são oferecidos por empresas parceiras independentes:
https://www.amicrocad.com.br/topocad-cursos

Para aprender o TOPOCAD2000, as videoaulas são gratuitas (opção 9).

Para voltar ao menu, digite MENU.`,

   "11": `OUTROS CONTATOS

SUPORTE (24h, todos os dias, só por e-mail):
contato@topocad2000.com.br

COMERCIAL (horário comercial, segunda a sexta, das 9h às 18h):
(21) 2717-4559

Para voltar ao menu, digite MENU.`,

   "12": `Certo. Descreva sua solicitação em uma mensagem que retornaremos no horário de atendimento: segunda a sexta, das 9h às 18h.`
};

// Numeros especiais do menu (usados pelo whatsapp.js)
const OPCAO_CURSOS = '10';   // palavras curso/treinamento
const OPCAO_CONTATOS = '11'; // palavras telefone/contato/falar
const OPCAO_OUTROS = '12';   // deixar mensagem (aviso por e-mail)

// Confirmacao enviada quando o cliente descreve a solicitacao da opcao 12
const RECEBIDO_OUTROS = `Recebido! Sua mensagem foi encaminhada e retornaremos no horário de atendimento: segunda a sexta, das 9h às 18h.

Para outras opções, digite MENU.`;

const PADRAO = `Não identifiquei sua opção.

Responda apenas com o NÚMERO de uma das opções do menu (1 a 12), ou digite MENU para ver as opções novamente.`;

// Cliente mandou audio, imagem, PDF, figurinha etc. (uma vez so;
// se insistir, o atendente fica em silencio e avisa a equipe)
const SO_TEXTO = `Este canal não ouve áudios nem abre imagens ou arquivos.

Escreva sua dúvida em texto, ou digite o NÚMERO de uma das opções do menu (1 a 12). Para ver o menu, digite MENU.`;

const AGRADECIMENTO = `Agradecemos por utilizar nossos serviços! Esperamos trabalhar com você novamente em breve.`;

// Cliente pede de novo, em seguida, a mesma resposta de palavra-chave
const JA_RESPONDIDO = `As informações sobre isso estão na mensagem acima.

Para outras opções, digite MENU.`;

// Cliente pergunta sobre Black Friday (palavra-chave). Sem detalhes.
const BLACK_FRIDAY = `Sim, teremos Black Friday em novembro.`;

// Cliente perdeu ou nao sabe o numero de serie (palavra-chave)
const NUMERO_SERIE = `NÚMERO DE SÉRIE

Receba seu número de série por e-mail, informando o CPF/CNPJ e o e-mail do cadastro:
https://microcad.azurewebsites.net/envianserie

Com o número de série você verifica sua versão e o valor da atualização em:
https://www.amicrocad.com.br/topocad2000/verificar-versao

Se o cadastro não for encontrado (cadastros antigos podem não ter o CPF), responda por aqui que nossa equipe verifica e retorna de segunda a sexta, das 9h às 18h.`;

// Enviada quando a IA nao consegue responder (falha ou sem a
// informacao) - a pergunta segue por e-mail para a equipe
const ENCAMINHADO = `Sua pergunta foi encaminhada para nossa equipe, que retorna de segunda a sexta, das 9h às 18h.

Para ver as opções, digite MENU.`;

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
  - Exportação em shapefile (SHP, com DBF e SHX), inclusive para o CAR: área consolidada, reserva legal e APP. Recurso da última atualização da V21.
- Licença vitalícia para a versão adquirida, sem mensalidade.
- Pagamento: PIX ou boleto à vista; cartão em até 10x sem juros. Na loja virtual, a primeira opção de pagamento (do próprio site) vai só até 3x; para mais de 3x o cliente deve escolher Mercado Pago na tela de pagamento. No Mercado Livre (https://www.mercadolivre.com.br/topocad2000-v21--microcad-envio-por-email/up/MLBU3881792188) também até 10x sem juros.
- Entrega por e-mail, com proteção de uso virtual ou por PendriveLock (opcional).
- Pessoa física (CPF): instalação em até 3 micros para uso próprio, não simultâneo.
- Pessoa jurídica (CNPJ): instalação em 1 micro, para uso de qualquer pessoa da empresa.
- Garantia geral de 1 ano. Suporte ilimitado por e-mail, 24h todos os dias.
- Cliente que perdeu ou não sabe o número de série: recebe por e-mail em https://microcad.azurewebsites.net/envianserie, informando o CPF/CNPJ e o e-mail do cadastro.
- Cadastros muito antigos podem não ter o CPF registrado; nesse caso a verificação de versão do site e o envio do número de série não encontram o cliente, e nossa equipe resolve.
- Site: www.topocad2000.com.br (videoaulas, downloads, grupos de WhatsApp, parcerias, revendas e a página de cursos de empresas parceiras).
- Videoaulas do TOPOCAD2000: gratuitas (opção 9), em https://www.amicrocad.com.br/topocad2000-videoaulas e pelo botão VÍDEO de cada comando.
- A Microcad não oferece cursos. Cursos de topografia, georreferenciamento e GNSS são de empresas parceiras independentes (opção 10): https://www.amicrocad.com.br/topocad-cursos. A Microcad não organiza esses cursos nem responde por conteúdo, preços ou condições.
- Última atualização da versão que o cliente já tem (V15 a V21): download em www.topocad2000.com.br > DOWNLOADS (https://www.amicrocad.com.br/topocad2000-download) ou, no programa, ícone M > tela MICROCAD - BR > botão VERIFICAR ATUALIZAÇÕES (opção 8). Mudar de versão para a V21 é a opção 5.
- Black Friday: sim, teremos Black Friday em novembro. Não há outros detalhes para informar.`;

const IA_REGRAS = `Você é o atendente virtual do WhatsApp comercial da MICROCAD (software TOPOCAD2000).

REGRAS OBRIGATÓRIAS:
- Responda em português do Brasil, de forma curta, cordial e objetiva (de preferência até 6 linhas).
- Use SOMENTE as informações da BASE abaixo. Nunca invente preços, descontos, prazos, funcionalidades, versões ou condições.
- Suporte técnico (erros, instalação, problemas de uso) é feito exclusivamente por e-mail: contato@topocad2000.com.br. Não tente resolver problemas técnicos; oriente a enviar o e-mail e a ver as videoaulas (opção 9).
- Dúvidas sobre como usar um comando específico: indique as videoaulas (opção 9) e o suporte por e-mail.
- Quando a resposta estiver em uma opção do menu, indique o número (ex.: "digite 6 para o link de download").
- Se a BASE não tiver a informação pedida, ou se o pedido precisar de uma pessoa (orçamento especial, desconto, revenda, parceria, nota fiscal de compra já feita, negociação), comece a resposta com a marca [ENCAMINHAR] e diga ao cliente, em uma ou duas linhas, que a pergunta foi encaminhada para nossa equipe, que retorna de segunda a sexta, das 9h às 18h. Não invente a resposta e não peça para digitar 12.
- Cliente que não sabe ou perdeu o número de série: indique o link https://microcad.azurewebsites.net/envianserie (informar CPF/CNPJ e e-mail do cadastro; o número de série chega por e-mail). Não precisa encaminhar.
- Cliente que envia um número de série (ex.: T2466) ou pede para verificar a versão ou o cadastro: você não tem acesso ao cadastro. Comece com [ENCAMINHAR] e diga que nossa equipe vai verificar o cadastro e retorna de segunda a sexta, das 9h às 18h.
- Cliente diz que só aparecem 3 parcelas, ou pergunta como parcelar em mais de 3x: explique que na tela de pagamento da loja virtual ele deve escolher Mercado Pago (até 10x sem juros). Não encaminhe.
- Dificuldade na loja virtual ou na verificação de versão do site (CPF não encontrado, cadastro antigo, pagamento que não conclui, link que não abre): não faça perguntas, comece com [ENCAMINHAR] e diga que nossa equipe vai verificar e retorna de segunda a sexta, das 9h às 18h.
- Depois de encaminhar, se o cliente continuar escrevendo sobre o mesmo assunto, não faça novas perguntas: comece de novo com [ENCAMINHAR] e confirme em uma linha que nossa equipe vai ver a conversa completa e que ele pode acrescentar detalhes por aqui.
- Cliente pede o download ou a última atualização da versão que já tem: indique www.topocad2000.com.br > DOWNLOADS (V15 a V21) e o botão VERIFICAR ATUALIZAÇÕES do programa (opção 8). Não encaminhe.
- Pergunta sobre shapefile (SHP, DBF, SHX) ou CAR: responda que sim, o TOPOCAD2000 V21, na última atualização, exporta em shapefile, inclusive para o CAR (área consolidada, reserva legal e APP). Quem já tem a V21 instala a última atualização (opção 8); quem tem versão anterior precisa atualizar para a V21 (opção 5); quem não tem pode testar por 30 dias (opção 6). Não encaminhe.
- Pergunta sobre cursos ou treinamentos: diga que a Microcad não oferece cursos e indique a opção 10 (cursos de empresas parceiras); para aprender o TOPOCAD2000, indique as videoaulas gratuitas (opção 9). Não encaminhe.
- Pergunta sobre Black Friday: responda apenas "Sim, teremos Black Friday em novembro." Não informe datas, descontos nem condições e não encaminhe.
- Só use a marca [ENCAMINHAR] nesses casos. Quando a BASE responde a pergunta, responda normalmente, sem a marca.
- Não converse sobre assuntos que não sejam da MICROCAD e dos seus produtos.
- Nunca peça senhas, dados de cartão ou documentos.
- Se perguntarem se você é uma pessoa, diga que é o atendente virtual automático da Microcad.
- Formatação de WhatsApp: texto simples; para destacar use *asterisco*. Não use títulos com #, tabelas nem links em markdown.
- Quando fizer sentido, termine com: "Para ver as opções, digite MENU."`;

export default {
   SAUDACAO, RESPOSTAS, RECEBIDO_OUTROS, PADRAO, SO_TEXTO, AGRADECIMENTO,
   JA_RESPONDIDO, BLACK_FRIDAY, NUMERO_SERIE, ENCAMINHADO, IA_SOBRE, IA_REGRAS,
   OPCAO_CURSOS, OPCAO_CONTATOS, OPCAO_OUTROS
};
