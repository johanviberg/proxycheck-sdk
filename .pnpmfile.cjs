// pnpm configuration file
module.exports = {
  hooks: {
    readPackage(pkg) {
      // Allow build scripts for necessary packages
      if (pkg.name === 'esbuild' || pkg.name === 'unrs-resolver') {
        pkg.scripts = pkg.scripts || {};
      }
      return pkg;
    }
  }
};