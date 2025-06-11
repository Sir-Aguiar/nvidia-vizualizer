// c:\Users\felip\OneDrive\Área de Trabalho\csv-analyzer.js
const fs = require("fs");
const path = require("path");

class CSVAnalyzer {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = [];
    this.headers = [];
  }

  // Lê e processa o arquivo CSV
  readCSV() {
    try {
      const content = fs.readFileSync(this.filePath, "utf8");
      const lines = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        throw new Error("Arquivo CSV vazio");
      }

      console.log(`Total de linhas no arquivo: ${lines.length}`);

      // Primeira linha como cabeçalho
      this.headers = this.parseCSVLine(lines[0]);
      console.log(`Cabeçalhos encontrados: ${this.headers.length}`);

      // Processa as demais linhas
      let processedLines = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        console.log(`Linha ${i}: ${values.length} valores, esperado: ${this.headers.length}`);

        // Aceita linhas com número de valores próximo ao esperado
        if (values.length >= this.headers.length - 1) {
          const row = {};
          this.headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });
          this.data.push(row);
          processedLines++;
        }
      }
      console.log(`Linhas processadas com sucesso: ${processedLines}`);
    } catch (error) {
      console.error("Erro ao ler arquivo CSV:", error.message);
      return false;
    }
    return true;
  }

  // Parse de linha CSV considerando vírgulas dentro de aspas
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim().replace(/^"|"$/g, ""));
    return result.filter((val, index) => index < 22 || val !== ""); // Remove colunas vazias extras
  }

  // Informações básicas sobre o dataset
  getBasicInfo() {
    return {
      totalLinhas: this.data.length,
      totalColunas: this.headers.length,
      colunas: this.headers,
      primeiras5Linhas: this.data.slice(0, 5),
    };
  }

  // Análise estatística para colunas numéricas
  getNumericStats(columnName) {
    const values = this.data
      .map((row) => {
        const val = row[columnName];
        if (val === "" || val === undefined || val === null) return NaN;
        return parseFloat(val.toString().replace(/[^\d.-]/g, ""));
      })
      .filter((val) => !isNaN(val) && isFinite(val));

    if (values.length === 0) return null;

    values.sort((a, b) => a - b);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      media: values.reduce((a, b) => a + b, 0) / values.length,
      mediana:
        values.length % 2 === 0
          ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
          : values[Math.floor(values.length / 2)],
    };
  }

  // Contagem de valores únicos
  getValueCounts(columnName) {
    const counts = {};
    this.data.forEach((row) => {
      const value = row[columnName];
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10); // Top 10
  }

  // Relatório completo
  generateReport() {
    console.log("\n" + "=".repeat(50));
    console.log("RELATÓRIO DE ANÁLISE DO CSV");
    console.log("=".repeat(50));

    const basicInfo = this.getBasicInfo();
    console.log(`Total de linhas: ${basicInfo.totalLinhas}`);
    console.log(`Total de colunas: ${basicInfo.totalColunas}`);

    if (basicInfo.totalLinhas === 0) {
      console.log("\n❌ ERRO: Nenhuma linha de dados foi processada!");
      console.log("Verifique se o arquivo CSV tem dados após o cabeçalho.");
      return;
    }

    console.log(`Colunas: ${basicInfo.colunas.join(", ")}`);

    console.log("\n" + "-".repeat(30));
    console.log("ANÁLISE POR COLUNA:");
    console.log("-".repeat(30));

    this.headers.forEach((header) => {
      if (!header || header.trim() === "") return;

      console.log(`\nColuna: ${header}`);

      // Tenta análise numérica
      const numStats = this.getNumericStats(header);
      if (numStats && numStats.count > 0) {
        console.log(`  Tipo: Numérica`);
        console.log(`  Valores válidos: ${numStats.count}`);
        console.log(`  Mínimo: ${numStats.min}`);
        console.log(`  Máximo: ${numStats.max}`);
        console.log(`  Média: ${numStats.media.toFixed(2)}`);
        console.log(`  Mediana: ${numStats.mediana.toFixed(2)}`);
      } else {
        console.log(`  Tipo: Texto/Categórica`);
        const valueCounts = this.getValueCounts(header);
        console.log(`  Valores únicos: ${valueCounts.length}`);
        if (valueCounts.length > 0) {
          console.log(`  Mais frequentes:`);
          valueCounts.slice(0, 5).forEach(([value, count]) => {
            const displayValue = value.length > 30 ? value.substring(0, 30) + "..." : value;
            console.log(`    ${displayValue}: ${count}`);
          });
        }
      }
    });
  }

  // Gera dados para visualização HTML
  generateHTMLData() {
    const htmlData = {
      basicInfo: this.getBasicInfo(),
      statistics: {},
      chartData: {
        fps: [],
        fps1Low: [],
        cpuUsage: [],
        gpu1Usage: [],
        gpu2Usage: [],
        timestamps: [],
      },
    };

    // Estatísticas por coluna
    this.headers.forEach((header) => {
      if (!header || header.trim() === "") return;
      const numStats = this.getNumericStats(header);
      if (numStats) {
        htmlData.statistics[header] = numStats;
      }
    });

    // Dados para gráficos
    this.data.forEach((row, index) => {
      htmlData.chartData.timestamps.push(index);
      htmlData.chartData.fps.push(parseFloat(row["FPS"]) || 0);
      htmlData.chartData.fps1Low.push(parseFloat(row["FPS 1(%) Low"]) || 0);
      htmlData.chartData.cpuUsage.push(parseFloat(row["CPU Utilization(%)"]) || 0);
      htmlData.chartData.gpu1Usage.push(parseFloat(row["GPU1 Utilization(%)"]) || 0);
      htmlData.chartData.gpu2Usage.push(parseFloat(row["GPU2 Utilization(%)"]) || 0);
    });

    // Salva dados para HTML
    fs.writeFileSync(path.join(__dirname, "data.json"), JSON.stringify(htmlData, null, 2));
    return htmlData;
  }
}

// Uso do script
function main() {
  // Substitua pelo caminho do seu arquivo CSV
  const csvPath = path.join(__dirname, "dados.csv");

  if (!fs.existsSync(csvPath)) {
    console.log('Arquivo CSV não encontrado. Coloque seu arquivo como "dados.csv" na mesma pasta deste script.');
    return;
  }

  const analyzer = new CSVAnalyzer(csvPath);

  if (analyzer.readCSV()) {
    analyzer.generateReport();
    analyzer.generateHTMLData();
    console.log("\n✅ Dados salvos em data.json para visualização HTML");
  }
}

// Executa o script
main();
