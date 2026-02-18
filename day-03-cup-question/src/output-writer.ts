import * as fs from 'fs';
import * as path from 'path';

/**
 * Класс для одновременного вывода в консоль и накопления контента для файла
 */
export class OutputWriter {
  private content: string[] = [];

  constructor(private filePath: string) {}

  /**
   * Добавляет текст без перевода строки
   */
  write(text: string): void {
    this.content.push(text);
    process.stdout.write(text);
  }

  /**
   * Добавляет текст с переводом строки
   */
  writeLine(text: string = ''): void {
    this.content.push(text);
    console.log(text);
  }

  /**
   * Добавляет пустую строку
   */
  writeEmptyLine(): void {
    this.content.push('');
    console.log();
  }

  /**
   * Добавляет разделитель
   */
  writeSeparator(char: string = '=', length: number = 60): void {
    const separator = char.repeat(length);
    this.content.push(separator);
    console.log(separator);
  }

  /**
   * Возвращает весь накопленный контент
   */
  getContent(): string {
    return this.content.join('\n');
  }

  /**
   * Сохраняет накопленный контент в файл
   */
  async save(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, this.content.join('\n'), 'utf-8');
  }
}
