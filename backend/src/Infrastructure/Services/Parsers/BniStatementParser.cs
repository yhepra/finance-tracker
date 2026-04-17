using FinanceTracker.Application.DTOs;
using FinanceTracker.Application.Interfaces;
using iText.Kernel.Pdf;
using iText.Kernel.Pdf.Canvas.Parser;
using iText.Kernel.Pdf.Canvas.Parser.Listener;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace FinanceTracker.Infrastructure.Services.Parsers;

public class BniStatementParser : IBankStatementParser
{
    public bool CanParse(string bankCode)
    {
        return bankCode.Equals("BNI", StringComparison.OrdinalIgnoreCase);
    }

    public IEnumerable<PdfTransactionRow> Parse(Stream pdfStream)
    {
        var transactions = new List<PdfTransactionRow>();
        StringBuilder textBuilder = new StringBuilder();

        using (PdfReader reader = new PdfReader(pdfStream))
        using (PdfDocument pdfDoc = new PdfDocument(reader))
        {
            for (int i = 1; i <= pdfDoc.GetNumberOfPages(); i++)
            {
                var page = pdfDoc.GetPage(i);
                var strategy = new SimpleTextExtractionStrategy();
                string text = PdfTextExtractor.GetTextFromPage(page, strategy);
                textBuilder.AppendLine(text);
            }
        }

        string fullText = textBuilder.ToString();
        var lines = fullText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

        // BNI Regex Placeholder (needs adjustment once actual sample is provided)
        // Adjusting roughly to common BNI e-statement formats
        var regex = new Regex(@"^(?<date>\d{2}-\d{2}-\d{4})\s+(?<desc>.*?)\s+(?<amount>[\d.,]+)\s*(?<type>DB|CR)?$", RegexOptions.IgnoreCase);

        foreach (var line in lines)
        {
            var match = regex.Match(line.Trim());
            if (match.Success)
            {
                if (DateTime.TryParseExact(match.Groups["date"].Value, "dd-MM-yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime date))
                {
                    string amountStr = match.Groups["amount"].Value.Replace(".", "").Replace(",", ".");
                    if (decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out decimal amount))
                    {
                        bool isCredit = match.Groups["type"].Value.Equals("CR", StringComparison.OrdinalIgnoreCase);
                        
                        transactions.Add(new PdfTransactionRow
                        {
                            Date = date,
                            Description = match.Groups["desc"].Value.Trim(),
                            Amount = amount,
                            IsCredit = isCredit
                        });
                    }
                }
            }
        }

        return transactions;
    }
}
