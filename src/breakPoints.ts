
import * as vscode from 'vscode';
import * as fs from 'fs';

export type Breakpoint = {
	path: string,
	line: string,
	enabled: string,
	condition: string
}

export type Task = {
	task: string,
	breakPoints: Breakpoint[]
}

export class Breakpoints {
	jsonPath: string = '';
	tasks: Task[] = [];

	constructor(jsonPath: string) {
		this.jsonPath = jsonPath;
		this.updateTasks();
	}

	updateTasks(): void {
		try {
			const filteredString = fs.readFileSync(this.jsonPath, 'utf8').split('\n').filter(line => !line.trim().startsWith('//'));
			this.tasks = JSON.parse(filteredString.join('\n'));
		} catch (error: any) { vscode.window.showErrorMessage(`Error parsing breakpoints JSON: ${error.message}`); }
	}

}