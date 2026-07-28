module.exports = {
  root: true,
  ignorePatterns: [
    "dist",
    "dist-tmp",
    "node_modules",
    "mock-server.js",
    "vitest.config.ts",
    "src/app/features/chart/services/performance-test.js"
  ],
  overrides: [
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: ["tsconfig.app.json", "tsconfig.spec.json", "tsconfig.e2e.json"],
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
        "@angular-eslint/component-class-suffix": [
          "error",
          {
            suffixes: ["Component", "Page"]
          }
        ],
        "@angular-eslint/no-empty-lifecycle-method": "warn",
        "@angular-eslint/no-input-rename": "warn",
        "@angular-eslint/no-output-native": "warn",
        "@angular-eslint/no-output-on-prefix": "warn",
        "@typescript-eslint/ban-types": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": "warn",
        "prefer-const": "warn",
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": ["@features/*/*", "!@features/*/index"],
                "message": "Deep imports from features are not allowed. Use the public API."
              },
              {
                "group": ["@state/*/*", "!@state/*/index"],
                "message": "Deep imports from state modules are not allowed. Use the public API."
              },
              {
                "group": ["@core/*/*", "!@core/*/index"],
                "message": "Deep imports from core modules are not allowed. Use the public API."
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["src/app/core/**/*.ts", "src/app/state/**/*.ts", "src/app/data-access/**/*.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "paths": [
              {
                "name": "@features",
                "message": "Core/State/Data-access layers cannot depend on features."
              },
              {
                "name": "@ui",
                "message": "Core/State/Data-access layers cannot depend on presentational UI."
              }
            ],
            "patterns": [
              {
                "group": ["@features/*", "@ui/*"],
                "message": "Core/State/Data-access layers cannot depend on features or UI."
              }
            ]
          }
        ]
      }
    },
    {
      files: ["*.html"],
      parser: "@angular-eslint/template-parser",
      plugins: ["@angular-eslint/template"],
      extends: ["plugin:@angular-eslint/template/recommended", "prettier"],
      rules: {
        "@angular-eslint/template/no-negated-async": "warn"
      }
    }
  ]
};
