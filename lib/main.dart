import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/theme.dart';
import 'package:echomatch/nav.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/services/game_service.dart';
import 'package:echomatch/services/match_service.dart';
import 'package:echomatch/services/chat_service.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:echomatch/firebase_options.dart';
import 'package:echomatch/config/env_loader.dart';
import 'package:flutter/foundation.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppEnv.load();
  try {
    final envOptions = await FirebaseEnvLoader.tryLoad();
    if (envOptions != null) {
      debugPrint('Initializing Firebase using env/dev.json');
      await Firebase.initializeApp(options: envOptions);
    } else {
      debugPrint('env/dev.json not found or incomplete. Falling back to DefaultFirebaseOptions');
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    }
  } catch (e) {
    debugPrint('Firebase initialization failed, retrying with default options. Error: $e');
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => GameService()),
        ChangeNotifierProvider(create: (_) => MatchService()),
        ChangeNotifierProvider(create: (_) => ChatService()),
      ],
      child: MaterialApp.router(
        title: 'Resonance',
        debugShowCheckedModeBanner: false,
        theme: lightTheme,
        darkTheme: darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
