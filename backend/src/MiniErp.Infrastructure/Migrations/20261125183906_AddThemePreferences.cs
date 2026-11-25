using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MiniErp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddThemePreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultColorTheme",
                table: "CompanySettings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "default");

            migrationBuilder.AddColumn<string>(
                name: "DefaultThemeMode",
                table: "CompanySettings",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "light");

            migrationBuilder.AddColumn<string>(
                name: "ColorTheme",
                table: "AspNetUsers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemeMode",
                table: "AspNetUsers",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultColorTheme",
                table: "CompanySettings");

            migrationBuilder.DropColumn(
                name: "DefaultThemeMode",
                table: "CompanySettings");

            migrationBuilder.DropColumn(
                name: "ColorTheme",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemeMode",
                table: "AspNetUsers");
        }
    }
}
