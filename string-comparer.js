const metaphone = require('./node_modules/metaphone');



exports.cleanString = (str) => {
    return str.replace('50', 'fifty')
              .replace(/&apos;/g, '')
              .replace(/_/g, ' ')
              .replace(/[^\w\s]/gi, '')
              .toLowerCase();
}

exports.calcAccuracy = (src, dst) => {
    src = metaphone(this.cleanString(src));
    dst = metaphone(this.cleanString(dst));
  
    distance = calcLevenshteinDistance(src, dst);
    const acc = (1.0 - distance / dst.length) * 100;
    return acc;
}

exports.selectSimilarWord = (target, words) => {
    const accArr = words.map((w) => this.calcAccuracy(target, w));
    console.log(accArr);
    return words[accArr.indexOf(accArr.reduce((a, b) => a > b ? a : b))]
}

const calcLevenshteinDistance = (s1, s2) => {
    const x = s1.length; 
    const y = s2.length; 
  
    let d = []; 
    for(let i = 0; i <= x; i++) { 
      d[i] = []; 
      d[i][0] = i; 
    } 
    for(let i = 0; i <= y; i++) { 
      d[0][i] = i; 
    } 
  
    let cost = 0; 
    for(let i = 1; i <= x; i++) { 
      for(let j = 1; j <= y; j++) { 
        cost = s1[i - 1] == s2[j - 1] ? 0 : 1; 
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost); 
      }
    }
    return d[x][y];
  }