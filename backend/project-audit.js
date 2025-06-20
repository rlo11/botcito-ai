// project-audit.js
// Run this to get a complete picture of your project structure

const fs = require('fs');
const path = require('path');

console.log('🔍 BOTCITO.AI PROJECT AUDIT\n');
console.log('='
  .repeat(50));

// Check package.json for database type
console.log('\n📦 DATABASE DEPENDENCIES:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const dbPackages = Object.keys(deps).filter(dep => 
    dep.includes('postgres') || 
    dep.includes('pg') || 
    dep.includes('sequelize') || 
    dep.includes('mongoose') || 
    dep.includes('mongodb')
  );
  
  if (dbPackages.length > 0) {
    dbPackages.forEach(pkg => console.log(`  - ${pkg}: ${deps[pkg]}`));
  } else {
    console.log('  No database packages found!');
  }
} catch (e) {
  console.log('  Error reading package.json');
}

// Check .env for database config
console.log('\n🔧 DATABASE CONFIGURATION (.env):');
try {
  const env = fs.readFileSync('.env', 'utf8');
  const dbLines = env.split('\n').filter(line => 
    line.includes('DB_') || 
    line.includes('MONGODB') || 
    line.includes('POSTGRES')
  );
  dbLines.forEach(line => {
    if (line && !line.startsWith('#')) {
      console.log(`  ${line}`);
    }
  });
} catch (e) {
  console.log('  No .env file found');
}

// Check models
console.log('\n📊 MODELS:');
try {
  const models = fs.readdirSync('models');
  models.forEach(model => {
    console.log(`  - ${model}`);
    // Check first few lines to see if it's Sequelize or Mongoose
    try {
      const content = fs.readFileSync(path.join('models', model), 'utf8');
      if (content.includes('mongoose') || content.includes('Schema')) {
        console.log('    → Mongoose/MongoDB model');
      } else if (content.includes('sequelize') || content.includes('DataTypes')) {
        console.log('    → Sequelize/PostgreSQL model');
      }
    } catch (e) {}
  });
} catch (e) {
  console.log('  No models directory found');
}

// Check controllers
console.log('\n🎮 CONTROLLERS:');
try {
  const controllers = fs.readdirSync('controllers').filter(f => f.endsWith('.js'));
  controllers.forEach(controller => {
    console.log(`  - ${controller}`);
  });
} catch (e) {
  console.log('  No controllers directory found');
}

// Check routes
console.log('\n🛣️  ROUTES:');
try {
  const routes = fs.readdirSync('routes').filter(f => f.endsWith('.js'));
  routes.forEach(route => {
    console.log(`  - ${route}`);
  });
} catch (e) {
  console.log('  No routes directory found');
}

// Check server.js for database initialization
console.log('\n🖥️  SERVER.JS DATABASE SETUP:');
try {
  const server = fs.readFileSync('server.js', 'utf8');
  if (server.includes('mongoose.connect')) {
    console.log('  ✓ Uses Mongoose (MongoDB)');
  }
  if (server.includes('sequelize') || server.includes('createConnection')) {
    console.log('  ✓ Uses Sequelize (PostgreSQL)');
  }
  
  // Check which routes are actually mounted
  console.log('\n  Mounted routes:');
  const routeMatches = server.match(/app\.use\(['"`]\/api\/\w+['"`]/g);
  if (routeMatches) {
    routeMatches.forEach(match => {
      console.log(`    ${match}`);
    });
  }
} catch (e) {
  console.log('  Error reading server.js');
}

console.log('\n' + '='.repeat(50));
console.log('\n💡 RECOMMENDATIONS:');
console.log('Based on this audit, you should:');
console.log('1. Decide on either PostgreSQL or MongoDB (not both)');
console.log('2. Remove unused database packages');
console.log('3. Ensure all models use the same database ORM');
console.log('4. Update controllers to match your database choice');
console.log('5. Clean up any duplicate or misnamed files');

console.log('\n Run this script with: node project-audit.js');