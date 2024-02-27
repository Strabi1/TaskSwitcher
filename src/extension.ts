import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tasks from './task'

export function activate(context: vscode.ExtensionContext) {

	// =========================================
	// Check and create .vscode folder
	// =========================================
	let vsCodeFolder = "";

	try {
		vsCodeFolder = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.vscode');

		if(!fs.existsSync(vsCodeFolder)) {
			try { fs.mkdirSync(vsCodeFolder); }
			catch {vscode.window.showErrorMessage(".vscode floder create error!"); return; }
		}
 
	} catch { vscode.window.showErrorMessage('No workspace is open! Please open a workspace or folder!'); return; }

	const bpFile = path.join(vsCodeFolder, 'breakpoints.json');
	const myTasks = new tasks.Tasks(bpFile);

	context.subscriptions.push(
		// =========================================
		// Export breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.exportBreakpoints', async() => {
			const picks = myTasks.getTasks().map(task => ({ label: task.task })); // Konvertálja a feladatokat QuickPickItem-ekké

			const selected = await vscode.window.showQuickPick(picks, {
				placeHolder: 'Choose a task',
			});
	
			if (selected) {
				vscode.window.showInformationMessage(`You selected: ${selected.label}`);

				const breakpoints = vscode.debug.breakpoints;
				const breakpointsData = breakpoints.map(bp => {
					if (bp instanceof vscode.SourceBreakpoint) {
					
						let breakpoint: tasks.Breakpoint = {
							path: bp.location.uri.fsPath,
							line: bp.location.range.start.line,
							enabled: bp.enabled,
							condition: bp.condition ? bp.condition : ''
						};

						return breakpoint;
						
					} 
					// else
					// 	return [];
				}).filter(Boolean);

				myTasks.exportBreakPoints(selected.label, breakpointsData) 
			}
		}),
		
		// =========================================
		// Import breakpoints
		// =========================================
		vscode.commands.registerCommand('extension.importBreakpoints', async () => {
			fs.readFile(bpFile, { encoding: 'utf8' }, async (err, data) => {
				if (err) {
					vscode.window.showErrorMessage('Error importing breakpoints: ' + err.message);
					return;
				}
				
				try {
					const breakpointsData = JSON.parse(data);
					const breakpoints = breakpointsData.map((bp: any) => {
						return new vscode.SourceBreakpoint(new vscode.Location(vscode.Uri.file(bp.path), new vscode.Position(bp.line, 0)), bp.enabled);
					});
					
					vscode.debug.removeBreakpoints(vscode.debug.breakpoints);
					vscode.debug.addBreakpoints(breakpoints);
					vscode.window.showInformationMessage('Breakpoints imported successfully.');
				} catch (error: any) {
					vscode.window.showErrorMessage(`Error parsing breakpoints JSON: ${error.message}`);
				}
			});
		}),
		
		vscode.commands.registerCommand('extension.createNewTask', async () => {
			const userInput = await vscode.window.showInputBox({
				prompt: 'Enter the name of the task!',
				placeHolder: 'Task name'
			});

			if (userInput)
				myTasks.createNewTask(userInput);
		})
	);
}

export function deactivate() {}
