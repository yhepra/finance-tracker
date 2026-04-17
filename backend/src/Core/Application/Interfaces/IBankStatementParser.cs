using FinanceTracker.Application.DTOs;
using System.Collections.Generic;
using System.IO;

namespace FinanceTracker.Application.Interfaces;

public interface IBankStatementParser
{
    bool CanParse(string bankCode);
    IEnumerable<PdfTransactionRow> Parse(Stream pdfStream);
}
