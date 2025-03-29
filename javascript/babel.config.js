export default {
  presets: [
    ['@babel/preset-env', { modules: false }]
  ],
  plugins: [
    // Custom plugin to remove problematic exports line
    function removeExportsEsModule() {
      return {
        visitor: {
          ExpressionStatement(path) {
            if (path.node.expression.type === 'CallExpression' &&
                path.node.expression.callee.type === 'MemberExpression' &&
                path.node.expression.callee.object.name === 'Object' &&
                path.node.expression.callee.property.name === 'defineProperty' &&
                path.node.expression.arguments[0].name === 'exports' &&
                path.node.expression.arguments[1].value === '__esModule') {
              path.remove();
            }
          }
        }
      };
    }
  ]
};