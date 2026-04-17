using FinanceTracker.Application.DTOs;
using System.Collections.Generic;
using System.IO;

namespace FinanceTracker.Application.Interfaces;

public interface IPdfParserService
{
    IEnumerable<PdfTransactionRow> ParseTransactions(Stream pdfStream, string bankCode);
}
