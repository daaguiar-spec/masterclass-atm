// Google Apps Script — salva os leads da landing page numa planilha
// 1. Crie uma planilha no Google Sheets com os títulos na linha 1:
//    Data | Nome | WhatsApp | utm_source | utm_campaign | utm_content
// 2. Na planilha: Extensões > Apps Script. Apague tudo e cole este código.
// 3. Implantar > Nova implantação > Tipo: App da Web
//    Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
// 4. Copie a URL gerada (termina em /exec) e cole em planilhaURL no index.html.

function doPost(e) {
  var p = e.parameter;
  SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
    p.data || new Date(), p.nome || '', p.whatsapp || '',
    p.utm_source || '', p.utm_campaign || '', p.utm_content || ''
  ]);
  return ContentService.createTextOutput('ok');
}
