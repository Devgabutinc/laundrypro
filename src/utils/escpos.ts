/**
 * Utility class for generating ESC/POS commands for thermal printers
 * Simplified version for basic printing needs
 */
export class EscPos {
  private buffer: string = '';
  private encoding: string = 'utf8';
  private characterWidth: number = 32; // Default for 58mm printer

  constructor() {
    this.init();
  }

  /**
   * Initialize printer
   */
  init(): EscPos {
    // ESC @ - Initialize printer
    this.buffer += '\x1B\x40';
    return this;
  }

  /**
   * Set text alignment to center
   */
  center(): EscPos {
    // ESC a 1 - Center alignment
    this.buffer += '\x1B\x61\x01';
    return this;
  }

  /**
   * Set text alignment to left
   */
  left(): EscPos {
    // ESC a 0 - Left alignment
    this.buffer += '\x1B\x61\x00';
    return this;
  }

  /**
   * Set text alignment to right
   */
  right(): EscPos {
    // ESC a 2 - Right alignment
    this.buffer += '\x1B\x61\x02';
    return this;
  }

  /**
   * Set bold mode
   */
  bold(enabled: boolean): EscPos {
    // ESC E n - Set/cancel bold mode
    this.buffer += enabled ? '\x1B\x45\x01' : '\x1B\x45\x00';
    return this;
  }

  /**
   * Add text to the buffer
   */
  text(text: string): EscPos {
    this.buffer += text;
    return this;
  }
  
  /**
   * Write raw data to the buffer
   */
  write(data: string): EscPos {
    this.buffer += data;
    return this;
  }

  /**
   * Add a line feed
   */
  feed(lines: number = 1): EscPos {
    // LF - Line feed
    for (let i = 0; i < lines; i++) {
      this.buffer += '\x0A';
    }
    return this;
  }

  /**
   * Add a horizontal line using dashes
   */
  line(): EscPos {
    const line = '-'.repeat(this.characterWidth);
    this.buffer += line;
    return this;
  }

  /**
   * Cut the paper
   */
  cut(): EscPos {
    // GS V - Paper cut
    this.buffer += '\x1D\x56\x41\x00';
    return this;
  }

  /**
   * Set character width (number of characters per line)
   */
  setCharacterWidth(width: number): EscPos {
    this.characterWidth = width;
    return this;
  }

  /**
   * Encode the buffer to a string that can be sent to the printer
   */
  encode(): string {
    return this.buffer;
  }

  /**
   * Reset the buffer
   */
  reset(): EscPos {
    this.buffer = '';
    return this;
  }
}
