using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResultService.Api.Migrations
{
    /// <inheritdoc />
    public partial class ChangePointsToFloat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<float>(
                name: "Score",
                table: "Results",
                type: "real",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<float>(
                name: "MaxPossibleScore",
                table: "Results",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<bool>(
                name: "IsCorrect",
                table: "ResultAnswers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<float>(
                name: "PointsAwarded",
                table: "ResultAnswers",
                type: "real",
                nullable: false,
                defaultValue: 0f);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxPossibleScore",
                table: "Results");

            migrationBuilder.DropColumn(
                name: "IsCorrect",
                table: "ResultAnswers");

            migrationBuilder.DropColumn(
                name: "PointsAwarded",
                table: "ResultAnswers");

            migrationBuilder.AlterColumn<int>(
                name: "Score",
                table: "Results",
                type: "int",
                nullable: false,
                oldClrType: typeof(float),
                oldType: "real");
        }
    }
}
