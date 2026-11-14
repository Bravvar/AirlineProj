using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Authorize(Roles = "Supervisor")]
[Route("api/admin/notifications")]
public class NotificationController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(
        ApplicationDbContext db,
        ILogger<NotificationController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private const string NotificationQuery = @"
        SELECT notification_id AS NotificationId,
               recipient_role AS RecipientRole,
               message AS Message,
               related_type AS RelatedType,
               related_id AS RelatedId,
               is_read AS IsRead,
               created_at AS CreatedAt
        FROM Notification";

    [HttpGet]
    public async Task<IActionResult> ListUnread()
    {
        try
        {
            var rows = await _db.Database
                .SqlQueryRaw<NotificationRow>(NotificationQuery + " WHERE is_read = 0 ORDER BY created_at DESC LIMIT 50")
                .ToListAsync();
            return Ok(rows);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading notifications");
            return StatusCode(503, new { message = "Unable to load notifications." });
        }
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        try
        {
            int affected = await _db.Database.ExecuteSqlRawAsync(
                "UPDATE Notification SET is_read = 1 WHERE notification_id = {0}", id);
            if (affected == 0) return NotFound("No notification like that.");
            return Ok(new { notificationId = id, isRead = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read");
            return StatusCode(503, new { message = "Unable to update notification." });
        }
    }
}

public class NotificationRow
{
    public int NotificationId { get; set; }
    public string RecipientRole { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string RelatedType { get; set; } = string.Empty;
    public int RelatedId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
