module.exports = {
  root: true,
  ignorePatterns: ["dist", "node_modules"],
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["tsconfig.app.json", "tsconfig.spec.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module"
      },
      plugins: ["@typescript-eslint", "@angular-eslint"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@angular-eslint/recommended",
        "prettier"
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "error"
      }
    },
    {
      files: ["*.html"],
      parser: "@angular-eslint/template-parser",
      plugins: ["@angular-eslint/template"],
      extends: ["plugin:@angular-eslint/template/recommended", "prettier"]
    }
  ]
};
