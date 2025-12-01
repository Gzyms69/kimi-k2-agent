import * as vscode from 'vscode';
import * as path from 'path';
import { ToolResult } from '../types';

export class FileManager {
  constructor(private workspaceRoot: string) {}

  async readFile(filePath: string): Promise<ToolResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const uri = vscode.Uri.file(absolutePath);
      const content = await vscode.workspace.fs.readFile(uri);
      
      return {
        success: true,
        data: Buffer.from(content).toString('utf-8'),
        output: `Read ${content.length} bytes from ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async writeFile(filePath: string, content: string): Promise<ToolResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const uri = vscode.Uri.file(absolutePath);
      
      const parentDir = path.dirname(absolutePath);
      await this.ensureDirectory(parentDir);
      
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
      
      return {
        success: true,
        output: `Wrote ${content.length} bytes to ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async createFile(filePath: string, content: string = ''): Promise<ToolResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const uri = vscode.Uri.file(absolutePath);
      
      try {
        await vscode.workspace.fs.stat(uri);
        return {
          success: false,
          error: `File already exists: ${filePath}`,
        };
      } catch {
        // File doesn't exist, proceed with creation
      }
      
      const parentDir = path.dirname(absolutePath);
      await this.ensureDirectory(parentDir);
      
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
      
      return {
        success: true,
        output: `Created file: ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async deleteFile(filePath: string): Promise<ToolResult> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const uri = vscode.Uri.file(absolutePath);
      
      await vscode.workspace.fs.delete(uri, { recursive: false });
      
      return {
        success: true,
        output: `Deleted file: ${filePath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async listDirectory(dirPath: string): Promise<ToolResult> {
    try {
      const absolutePath = this.resolvePath(dirPath);
      const uri = vscode.Uri.file(absolutePath);
      
      // Check if directory exists first
      try {
        await vscode.workspace.fs.stat(uri);
      } catch {
        return {
          success: false,
          error: `Directory does not exist: ${dirPath}`,
        };
      }
      
      const entries = await vscode.workspace.fs.readDirectory(uri);
      
      const items = entries.map(([name, type]) => ({
        name,
        type: type === vscode.FileType.Directory ? 'directory' : 'file',
        path: path.join(dirPath, name),
      }));
      
      return {
        success: true,
        data: items,
        output: `Listed ${items.length} items in ${dirPath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async createDirectory(dirPath: string): Promise<ToolResult> {
    try {
      const absolutePath = this.resolvePath(dirPath);
      const uri = vscode.Uri.file(absolutePath);
      
      // Check if already exists
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type === vscode.FileType.Directory) {
          return {
            success: false,
            error: `Directory already exists: ${dirPath}`,
          };
        } else {
          return {
            success: false,
            error: `Path exists but is not a directory: ${dirPath}`,
          };
        }
      } catch {
        // Directory doesn't exist, proceed with creation
      }
      
      await vscode.workspace.fs.createDirectory(uri);
      
      return {
        success: true,
        output: `Created directory: ${dirPath}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async searchFiles(pattern: string, searchContent?: string): Promise<ToolResult> {
    try {
      const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);
      
      let results = files.map(f => ({
        path: vscode.workspace.asRelativePath(f),
        uri: f.toString(),
      }));
      
      if (searchContent) {
        const matchingFiles: Array<{ path: string; matches: string[] }> = [];
        
        for (const file of files.slice(0, 50)) {
          try {
            const content = await vscode.workspace.fs.readFile(file);
            const text = Buffer.from(content).toString('utf-8');
            
            if (text.includes(searchContent)) {
              const lines = text.split('\n');
              const matches = lines
                .map((line, i) => ({ line: i + 1, text: line }))
                .filter(({ text }) => text.includes(searchContent))
                .slice(0, 5)
                .map(({ line, text }) => `Line ${line}: ${text.trim().substring(0, 100)}`);
              
              if (matches.length > 0) {
                matchingFiles.push({
                  path: vscode.workspace.asRelativePath(file),
                  matches,
                });
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }
        
        return {
          success: true,
          data: matchingFiles,
          output: `Found ${matchingFiles.length} files containing "${searchContent}"`,
        };
      }
      
      return {
        success: true,
        data: results,
        output: `Found ${results.length} files matching "${pattern}"`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePath(filePath);
      const uri = vscode.Uri.file(absolutePath);
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.workspaceRoot, filePath);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    const uri = vscode.Uri.file(dirPath);
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      await vscode.workspace.fs.createDirectory(uri);
    }
  }
}
