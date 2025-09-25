// const path = require("path");
// const CleanWebpackPlugin = require("clean-webpack-plugin");
// const CopyPlugin = require("copy-webpack-plugin");

// module.exports = {
//   entry: "./src/index.jsx",
//   output: {
//     path: path.resolve(__dirname, "dist"),
//     filename: "index.js",
//   },
//   devtool: "cheap-eval-source-map", // won't work on XD due to lack of eval
//   externals: {
//     uxp: "commonjs2 uxp",
//     premierepro: "commonjs2 premierepro",
//     fs: "commonjs2 fs",
//   },
//   resolve: {
//     extensions: [".js", ".jsx"],
//   },
//   module: {
//     rules: [
//       {
//         test: /\.jsx?$/,
//         exclude: /node_modules/,
//         loader: "babel-loader",
//         options: {
//           plugins: [
//             "@babel/transform-react-jsx",
//             "@babel/proposal-object-rest-spread",
//             "@babel/plugin-syntax-class-properties",
//           ],
//         },
//       },
//       {
//         test: /\.png$/,
//         exclude: /node_modules/,
//         loader: "file-loader",
//       },
//       {
//         test: /\.css$/,
//         use: ["style-loader", "css-loader"],
//       },
//     ],
//   },
//   plugins: [
//     //new CleanWebpackPlugin(),
//     new CopyPlugin(["plugin"], {
//       copyUnmodified: true,
//     }),
//   ],
// };
// webpack.config.js
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.jsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
  },
  devtool: "source-map",
  externals: {
    uxp: "commonjs2 uxp",
    premierepro: "commonjs2 premierepro",
    fs: "commonjs2 fs",
  },
  resolve: { extensions: [".js", ".jsx"] },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: [
            ["@babel/preset-env", { targets: { esmodules: false } }],
            "@babel/preset-react",
          ],
          plugins: [
            "@babel/plugin-proposal-optional-chaining",
            "@babel/plugin-proposal-nullish-coalescing-operator",
            "@babel/plugin-proposal-object-rest-spread",
            "@babel/plugin-proposal-class-properties",
          ],
        },
      },
      { test: /\.png$/, exclude: /node_modules/, loader: "file-loader" },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
  plugins: [
    new CopyPlugin(
      [
        { from: "plugin", to: "plugin" }, // ✅ 배열로 패턴 나열
      ],
      {
        // v4/5 옵션
        copyUnmodified: true, // 필요 없으면 삭제
      }
    ),
  ],
};
