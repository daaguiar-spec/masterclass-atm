// Google Apps Script — salva cada lead numa planilha E envia um e-mail de aviso
// (alternativa gratuita e mais confiável ao FormSubmit)
//
// 1. Crie uma planilha no Google Sheets com os títulos na linha 1:
//    Data | Nome | WhatsApp | utm_source | utm_campaign | utm_content
// 2. Na planilha: Extensões > Apps Script. Apague tudo e cole este código.
// 3. Implantar > Nova implantação > Tipo: App da Web
//    Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
//    (o Google vai pedir autorização: Avançado > Acessar projeto > Permitir)
// 4. Copie a URL gerada (termina em /exec) e cole em planilhaURL no index.html.

var EMAIL_AVISO = 'comercial@sinapseonline.com';

function doPost(e) {
  var p = e.parameter;
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
    p.data || new Date(), p.nome || '', p.whatsapp || '',
    p.utm_source || '', p.utm_campaign || '', p.utm_content || ''
  ]);

  if (EMAIL_AVISO) {
    MailApp.sendEmail({
      to: EMAIL_AVISO,
      subject: 'Novo lead Masterclass: ' + (p.nome || ''),
      htmlBody:
        '<p><b>Nome:</b> ' + (p.nome || '') + '</p>' +
        '<p><b>WhatsApp:</b> <a href="https://wa.me/' + (p.whatsapp || '') + '">' + (p.whatsapp || '') + '</a></p>' +
        '<p><b>Data:</b> ' + (p.data || '') + '</p>' +
        '<p><b>Origem:</b> ' + (p.utm_source || '-') + ' / ' + (p.utm_campaign || '-') + ' / ' + (p.utm_content || '-') + '</p>'
    });
  }
  return ContentService.createTextOutput('ok');
}
