import axios from 'axios';

const WANDBOX_MAP = {
  cpp: 'gcc-head',
  rust: 'rust-1.82.0',
  go: 'go-1.23.2',
  java: 'openjdk-jdk-22+36',
  python: 'cpython-head',
  javascript: 'nodejs-head',
  typescript: 'typescript-5.3.3',
  sql: 'sqlite-3.46.1',
};

/**
 * Executes code using the Wandbox public API.
 * @param {string} language - The language identifier.
 * @param {string} code - The code to execute.
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export async function executeRemote(language, code) {
  const compiler = WANDBOX_MAP[language];
  if (!compiler) {
    throw new Error(`Execution for language '${language}' is not supported remotely via Wandbox.`);
  }

  try {
    const response = await axios.post('https://wandbox.org/api/compile.json', {
      compiler: compiler,
      code: code,
      save: false,
    });

    const data = response.data;
    // Wandbox returns program_message for stdout and compiler_message for stderr (usually)
    // But it also has program_error.
    
    return {
      stdout: data.program_message || "",
      stderr: data.compiler_message || data.program_error || "",
      exitCode: data.status === "0" ? 0 : 1,
    };
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    return {
      stdout: "",
      stderr: `❌ Remote Execution Error (Wandbox): ${errorMsg}`,
      exitCode: 1,
    };
  }
}
