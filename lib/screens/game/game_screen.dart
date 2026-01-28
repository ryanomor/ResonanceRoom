import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/models/question.dart';
import 'package:echomatch/models/game_session.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/game_service.dart';
import 'package:echomatch/services/question_service.dart';
import 'package:echomatch/services/user_service.dart';
import 'package:echomatch/services/match_service.dart';
import 'package:echomatch/services/room_service.dart';
import 'package:echomatch/models/room.dart';
import 'package:echomatch/theme.dart';

class GameScreen extends StatefulWidget {
  final String roomId;

  const GameScreen({super.key, required this.roomId});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late final GameService _gameService;
  late final AuthService _authService;
  final _questionService = QuestionService();
  final _userService = UserService();
  final _matchService = MatchService();
  
  Question? _currentQuestion;
  String? _selectedAnswer;
  bool _hasAnswered = false;
  Room? _room;

  @override
  void initState() {
    super.initState();
    _gameService = Provider.of<GameService>(context, listen: false);
    _authService = Provider.of<AuthService>(context, listen: false);
    _loadSession();
  }

  Future<void> _loadSession() async {
    final session = await _gameService.getSessionByRoomId(widget.roomId);
    if (session != null && session.currentQuestionId != null) {
      final question = await _questionService.getQuestionById(session.currentQuestionId!);
      setState(() => _currentQuestion = question);
      await _gameService.startQuestion();
      // Load room to determine host
      final room = await RoomService().getRoomById(widget.roomId);
      setState(() => _room = room);
    }
  }

  Future<void> _submitAnswer(String answer) async {
    if (_hasAnswered) return;
    
    setState(() {
      _selectedAnswer = answer;
      _hasAnswered = true;
    });

    await _gameService.submitAnswer(_authService.currentUser!.id, answer);
    // Do not auto-open selection. It will open when all have answered or host ends the round.
  }

  Future<void> _endGame() async {
    final session = _gameService.currentSession!;
    if (session.isTest) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ Test run completed')));
      context.go('/room/${widget.roomId}');
      return;
    }

    final selections = await _gameService.getAllSelectionsForSession(session.id);
    final matches = await _matchService.calculateMatches(selections);
    
    if (!mounted) return;
    
    if (matches.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('🎉 You have ${matches.where((m) => m.uid1 == _authService.currentUser!.id || m.uid2 == _authService.currentUser!.id).length} new matches!')));
    }
    
    context.go('/matches');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Consumer<GameService>(builder: (context, gs, _) {
          final isTest = gs.currentSession?.isTest == true;
          return Text(isTest ? 'Test Run' : 'Game in Progress');
        }),
        automaticallyImplyLeading: false,
      ),
      body: Consumer<GameService>(
        builder: (context, gameService, child) {
          if (gameService.currentSession == null || _currentQuestion == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final session = gameService.currentSession!;
          bool isHost = _room != null && _authService.currentUser?.id == _room!.hostId;
          if (session.isTest) isHost = true;
          
          if (session.gameState == GameState.question) {
            return QuestionView(
              question: _currentQuestion!,
              selectedAnswer: _selectedAnswer,
              onAnswer: _submitAnswer,
              questionNumber: session.currentQuestionIndex + 1,
              totalQuestions: session.questionIds.length,
              isHost: isHost,
              hasAnswered: _hasAnswered,
              onHostEndRound: () async {
                await _gameService.endQuestionByHost();
              },
            );
          } else if (session.gameState == GameState.selection) {
            return SelectionView(
              gameService: gameService,
              userService: _userService,
              currentUserId: _authService.currentUser!.id,
              isHost: isHost,
              onComplete: () async {
                if (session.hasMoreQuestions) {
                  await gameService.nextQuestion();
                  await _loadSession();
                  setState(() {
                    _hasAnswered = false;
                    _selectedAnswer = null;
                  });
                } else {
                  await _endGame();
                }
              },
            );
          }

          return const Center(child: Text('Game ended'));
        },
      ),
    );
  }
}

class QuestionView extends StatelessWidget {
  final Question question;
  final String? selectedAnswer;
  final Function(String) onAnswer;
  final int questionNumber;
  final int totalQuestions;
  final bool isHost;
  final bool hasAnswered;
  final VoidCallback? onHostEndRound;

  const QuestionView({super.key, required this.question, this.selectedAnswer, required this.onAnswer, required this.questionNumber, required this.totalQuestions, this.isHost = false, this.hasAnswered = false, this.onHostEndRound});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: AppSpacing.paddingLg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LinearProgressIndicator(value: questionNumber / totalQuestions),
          const SizedBox(height: 24),
          Text('Question $questionNumber of $totalQuestions', style: context.textStyles.titleMedium?.withColor(Theme.of(context).colorScheme.primary)),
          const SizedBox(height: 24),
          Text(question.questionText, style: context.textStyles.headlineMedium?.semiBold),
          const SizedBox(height: 40),
          ...question.options.map((option) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: ElevatedButton(
              onPressed: (!isHost && selectedAnswer == null) ? () => onAnswer(option) : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: selectedAnswer == option ? Theme.of(context).colorScheme.primaryContainer : null,
                padding: const EdgeInsets.all(20),
              ),
              child: Builder(builder: (context) {
                final isSelected = selectedAnswer == option;
                final selectedColor = Theme.of(context).colorScheme.onPrimaryContainer;
                return Text(option, style: isSelected ? context.textStyles.bodyLarge?.withColor(selectedColor) : context.textStyles.bodyLarge);
              }),
            ),
          )),
          const SizedBox(height: 16),
          if (hasAnswered)
            Text('Waiting for everyone to answer or host to end the round…', style: context.textStyles.bodyMedium),
          if (isHost)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: ElevatedButton.icon(
                onPressed: onHostEndRound,
                icon: const Icon(Icons.flag_circle, color: Colors.white),
                label: const Text('End question for everyone'),
              ),
            ),
        ],
      ),
    );
  }
}

class SelectionView extends StatefulWidget {
  final GameService gameService;
  final UserService userService;
  final String currentUserId;
  final VoidCallback onComplete;
  final bool isHost;

  const SelectionView({super.key, required this.gameService, required this.userService, required this.currentUserId, required this.onComplete, this.isHost = false});

  @override
  State<SelectionView> createState() => _SelectionViewState();
}

class _SelectionViewState extends State<SelectionView> {
  final Set<String> _selectedUsers = {};
  List<String> _matchingUsers = [];
  bool _submitted = false;

  @override
  void initState() {
    super.initState();
    _loadMatchingUsers();
  }

  Future<void> _loadMatchingUsers() async {
    final usersByAnswer = await widget.gameService.getUsersByAnswer();
    final myAnswer = widget.gameService.currentRoundAnswers[widget.currentUserId];
    
    if (myAnswer != null) {
      final users = usersByAnswer[myAnswer] ?? [];
      setState(() => _matchingUsers = users.where((id) => id != widget.currentUserId).toList());
    }
  }

  void _toggleSelection(String userId) {
    setState(() {
      if (_selectedUsers.contains(userId)) {
        _selectedUsers.remove(userId);
      } else {
        _selectedUsers.add(userId);
      }
    });
  }

  Future<void> _submitSelections() async {
    for (final userId in _selectedUsers) {
      await widget.gameService.submitSelection(widget.currentUserId, userId);
    }
    setState(() => _submitted = true);
    // Only host advances the game. Non-hosts just wait after submitting.
    if (widget.isHost) {
      // Host may still choose to wait, so do not auto-advance here.
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: AppSpacing.paddingLg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('👥 Select people to connect', style: context.textStyles.headlineMedium?.semiBold),
          const SizedBox(height: 12),
          Text('You chose the same answer as these people!', style: context.textStyles.bodyLarge),
          const SizedBox(height: 24),
          Expanded(
            child: _matchingUsers.isEmpty
                ? const Center(child: Text('No one else chose this answer'))
                : ListView.builder(
                    itemCount: _matchingUsers.length,
                    itemBuilder: (context, index) {
                      final userId = _matchingUsers[index];
                      return FutureBuilder(
                        future: widget.userService.getUserById(userId),
                        builder: (context, snapshot) {
                          final user = snapshot.data;
                          if (user == null) return const SizedBox();
                          
                          final isSelected = _selectedUsers.contains(userId);
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            color: isSelected ? Theme.of(context).colorScheme.primaryContainer : null,
                            child: ListTile(
                              leading: CircleAvatar(child: Text(user.username.isNotEmpty ? user.username[0] : '?')),
                              title: Text(user.username),
                              subtitle: Text(user.bio ?? '@${user.username}'),
                              trailing: isSelected ? const Icon(Icons.check_circle, color: Colors.green) : const Icon(Icons.circle_outlined),
                              onTap: (_submitted || widget.isHost) ? null : () => _toggleSelection(userId),
                            ),
                          );
                        },
                      );
                    },
                  ),
          ),
          const SizedBox(height: 16),
          if (!_submitted && !widget.isHost)
            ElevatedButton(
              onPressed: _submitSelections,
              child: Text(_selectedUsers.isEmpty ? 'Skip' : 'Submit (${_selectedUsers.length} selected)')),
          if (_submitted && !widget.isHost)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Selections submitted. Waiting for host to continue…', style: context.textStyles.bodyMedium),
            ),
          if (widget.isHost)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: ElevatedButton.icon(
                onPressed: widget.onComplete,
                icon: const Icon(Icons.playlist_add_check_circle, color: Colors.white),
                label: const Text('Close selection and go to next question'),
              ),
            ),
        ],
      ),
    );
  }
}
