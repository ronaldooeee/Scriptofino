module.exports = class Case {
    constructor(test, body) {
      Object.assign(this, { test, body });
    }
    analyze(context) {
      this.test.analyze(context);
      const bodyContext = context.createChildContextForBlock();
      this.body.forEach(e => e.analyze(bodyContext));
      //this.body.analyze(bodyContext);
    }
  
};