using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixBudgetUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // MySQL requires dropping FK constraints before dropping the index they depend on.
            // Find FKs referencing Budgets and temporarily drop them.
            // The FK on Budgets table itself (UserId -> Users) uses a separate index.
            // The index IX_Budgets_UserId_CategoryId_Period is a unique index, not a FK target —
            // but MySQL may use it for FK support on the same table columns.
            // Strategy: rename index by adding new one first, then drop old one.

            // Step 1: Create the new index first (allowed since columns differ)
            migrationBuilder.CreateIndex(
                name: "IX_Budgets_UserId_CategoryId_Period_TargetDate",
                table: "Budgets",
                columns: new[] { "UserId", "CategoryId", "Period", "TargetDate" },
                unique: true);

            // Step 2: Drop foreign key constraints that depend on the old index
            migrationBuilder.Sql(
                "ALTER TABLE `Budgets` DROP FOREIGN KEY IF EXISTS `FK_Budgets_Users_UserId`;");

            // Step 3: Drop the old index
            migrationBuilder.Sql(
                "DROP INDEX `IX_Budgets_UserId_CategoryId_Period` ON `Budgets`;");

            // Step 4: Recreate the FK (EF Core uses UserId with a separate index)
            migrationBuilder.Sql(
                "ALTER TABLE `Budgets` ADD CONSTRAINT `FK_Budgets_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `Users`(`Id`) ON DELETE CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Budgets_UserId_CategoryId_Period_TargetDate",
                table: "Budgets");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_UserId_CategoryId_Period",
                table: "Budgets",
                columns: new[] { "UserId", "CategoryId", "Period" },
                unique: true);
        }
    }
}
