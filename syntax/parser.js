const fs = require('fs');
const ohm = require('ohm-js');
const withIndentsAndDedents = require('./preparser');

const Program = require('../ast/program');
const VariableDeclaration = require('../ast/variable-declaration');
const AssignmentStatement = require('../ast/assignment-statement');
const BreakStatement = require('../ast/break-statement');
const ReturnStatement = require('../ast/return-statement');
const IfStatement = require('../ast/if-statement');
const Case = require('../ast/case');
const Error = require('../ast/error');
const WhileStatement = require('../ast/while-statement');
const ForStatement = require('../ast/for-statement');
const CallStatement = require('../ast/call-statement');
const FunctionDeclaration = require('../ast/function-declaration');
const FunctionAnnotation = require('../ast/annotate');
const ListExpression = require('../ast/list-expression');
const DictionaryExpression = require('../ast/dictionary-expression');
const TupleExpression = require('../ast/tuple-expression');
const BinaryExpression = require('../ast/binary-expression');
const UnaryExpression = require('../ast/unary-expression');
const IdentifierExpression = require('../ast/identifier-expression');
const SubscriptedExpression = require('../ast/subscripted-expression');
const Parameter = require('../ast/parameter');
const Argument = require('../ast/argument');
const KeyValue = require('../ast/key-value');
const ListTypeExpression = require('../ast/list-type');
const TupleTypeExpression = require('../ast/tuple-type');
const DictTypeExpression = require('../ast/dict-type');
const BooleanLiteral = require('../ast/boolean-literal');
const NumericLiteral = require('../ast/numeric-literal');
const StringLiteral = require('../ast/string-literal');
const NoneLiteral = require('../ast/none-literal');

const grammar = ohm.grammar(fs.readFileSync('./syntax/Scriptofino.ohm'));

// Ohm turns `x?` into either [x] or [], which we should clean up for our AST.
function unpack(a) {
  return a.length === 0 ? null : a[0];
}

const astGenerator = grammar.createSemantics().addOperation('ast', {
  Program(_1, body, _2) { return new Program(body.ast()); },
  Stmt_simple(statement, _) { return statement.ast(); },
  For(_1, id, _2, exps, suite) { return new ForStatement(id.ast(), exps.ast(), suite.ast()); },
  While(_, test, suite) { return new WhileStatement(test.ast(), suite.ast()); },
  Conditional(_1, _2, firstTest, _3, firstSuite, _4, additionalTests, additionalSuites, _5, finalSuite) {
    const tests = [firstTest.ast(), ...additionalTests.ast()];
    const bodies = [firstSuite.ast(), ...additionalSuites.ast()];
    const cases = tests.map((test, index) => new Case(test, bodies[index]));
    return new IfStatement(cases, unpack(finalSuite.ast()));
  },
  FuncDec(annotation, _1, _2, id, _3, params, _4, suite) { return new FunctionDeclaration(annotation.ast(), id.ast(), params.ast(), suite.ast()); },
  Annotation(id, _1, paramTypes, _2, resultTypes) { return new FunctionAnnotation(id.ast(), paramTypes.ast(), resultTypes.ast()); },
  Error(_1, _2, e, _3, _4) { return new Error(e.ast()); },
  VarConst(_1, v, _2, e) { return new VariableDeclaration(v.ast(), e.ast(), false); },
  VarMutable(_1, v, _2, e) { return new VariableDeclaration(v.ast(), e.ast(), true); },
  Assignment(v, _, e) { return new AssignmentStatement(v.ast(), e.ast()); },
  SimpleStmt_break(_) { return new BreakStatement(); },
  SimpleStmt_return(_, e) { return new ReturnStatement(unpack(e.ast())); },
  Suite_small(_1, statement, _2) { return [statement.ast()]; },
  Suite_large(_1, _2, _3, statements, _4) { return statements.ast(); },
  Exp_or(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp_and(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp1_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp2_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp3_binary(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp4_unary(op, operand) { return new UnaryExpression(op.ast(), operand.ast()); },
  Exp5_power(left, op, right) { return new BinaryExpression(op.ast(), left.ast(), right.ast()); },
  Exp6_list(_1, expressions, _2) { return new ListExpression(expressions.ast()); },
  Exp6_dictionary(_1, expressions, _2) { return new DictionaryExpression(expressions.ast()); },
  Exp6_tuple(_1, expressions, _2) { return new TupleExpression(expressions.ast()); },
  Exp6_parens(_1, expression, _2) { return expression.ast(); },
  Call(callee, _1, args, _2) { return new CallStatement(callee.ast(), args.ast()); },
  VarExp_subscripted(v, _1, e, _2) { return new SubscriptedExpression(v.ast(), e.ast()); },
  VarExp_simple(id) { return new IdentifierExpression(id.ast()); },
  Param(id, _, exp) { return new Parameter(id.ast(), unpack(exp.ast())); },
  Arg(id, _, exp) { return new Argument(unpack(id.ast()), exp.ast()); },
  KeyVal(id, _,exp) { return new KeyValue(id.ast(), exp.ast()); },
  ListType(_1, _2, type, _3) { return new ListTypeExpression(type.ast()); },
  TupleType(_1, _2, type, _3) { return new TupleTypeExpression(type.ast()); },
  DictType(_1, _2, key, _3, value, _4) { return new DictTypeExpression(key.ast(), value.ast()); },
  NonemptyListOf(first, _, rest) { return [first.ast(), ...rest.ast()]; },
  EmptyListOf() { return []; },
  id(_1, _2) { return this.sourceString; },
  numlit(_1, _2, _3, _4, _5, _6) { return new NumericLiteral(+this.sourceString); },
  boollit(_) { return new BooleanLiteral(!!this.sourceString); },
  strlit(_1, chars, _6) { return new StringLiteral(this.sourceString); },
  nonelit(_){ return new NoneLiteral(this.sourceString); },
  _terminal() { return this.sourceString; },
});

module.exports = (text) => {
    const match = grammar.match(withIndentsAndDedents(text));
    if (!match.succeeded()) {
      throw new Error(`Syntax Error: ${match.message}`);
    }
    return astGenerator(match).ast();
  };