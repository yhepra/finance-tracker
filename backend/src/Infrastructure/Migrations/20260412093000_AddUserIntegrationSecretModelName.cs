using FinanceTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace FinanceTracker.Infrastructure.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260412093000_AddUserIntegrationSecretModelName")]
public class AddUserIntegrationSecretModelName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ModelName",
            table: "UserIntegrationSecrets",
            type: "varchar(120)",
            maxLength: 120,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ModelName",
            table: "UserIntegrationSecrets");
    }
}

