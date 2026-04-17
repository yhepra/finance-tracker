using FinanceTracker.Application.DTOs;
using FinanceTracker.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace FinanceTracker.Infrastructure.Services;

public class PdfParserService : IPdfParserService
{
    private readonly IEnumerable<IBankStatementParser> _parsers;

    public PdfParserService(IEnumerable<IBankStatementParser> parsers)
    {
        _parsers = parsers;
    }

    public IEnumerable<PdfTransactionRow> ParseTransactions(Stream pdfStream, string bankCode)
    {
        var parser = _parsers.FirstOrDefault(p => p.CanParse(bankCode));
        if (parser == null)
            throw new NotSupportedException($"Parser for bank code '{bankCode}' is not supported.");

        return parser.Parse(pdfStream);
    }
}
