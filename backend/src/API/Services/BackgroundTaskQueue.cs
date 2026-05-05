using System.Threading.Channels;

namespace FinanceTracker.API.Services;

public interface IBackgroundTaskQueue
{
    void Enqueue(Func<CancellationToken, Task> workItem);
    Task<Func<CancellationToken, Task>> DequeueAsync(CancellationToken cancellationToken);
}

public class BackgroundTaskQueue : IBackgroundTaskQueue
{
    private readonly Channel<Func<CancellationToken, Task>> _queue;

    public BackgroundTaskQueue(int capacity = 200)
    {
        var options = new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        };
        _queue = Channel.CreateBounded<Func<CancellationToken, Task>>(options);
    }

    public void Enqueue(Func<CancellationToken, Task> workItem)
    {
        if (workItem == null) throw new ArgumentNullException(nameof(workItem));
        _queue.Writer.TryWrite(workItem);
    }

    public async Task<Func<CancellationToken, Task>> DequeueAsync(CancellationToken cancellationToken)
    {
        var workItem = await _queue.Reader.ReadAsync(cancellationToken);
        return workItem;
    }
}

