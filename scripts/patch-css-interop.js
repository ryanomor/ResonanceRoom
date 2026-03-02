const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'node_modules', 'react-native-css-interop', 'babel.js');

if (!fs.existsSync(target)) {
  process.exit(0);
}

const current = fs.readFileSync(target, 'utf8');

if (current.includes('react-native-worklets/plugin') && !current.includes('require.resolve')) {
  const patched = `module.exports = function () {
  const plugins = [
    require("./dist/babel-plugin").default,
    [
      "@babel/plugin-transform-react-jsx",
      {
        runtime: "automatic",
        importSource: "react-native-css-interop",
      },
    ],
  ];

  try {
    require.resolve("react-native-worklets/plugin");
    plugins.push("react-native-worklets/plugin");
  } catch (_) {
  }

  return { plugins };
};
`;
  fs.writeFileSync(target, patched, 'utf8');
  console.log('Patched react-native-css-interop/babel.js to make react-native-worklets optional.');
}
