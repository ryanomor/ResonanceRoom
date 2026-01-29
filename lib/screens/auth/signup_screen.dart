import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:echomatch/services/auth_service.dart';
import 'package:echomatch/models/user.dart';
import 'package:echomatch/theme.dart';
import 'package:provider/provider.dart';
import 'package:echomatch/widgets/city_picker_sheet.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _usernameController = TextEditingController();
  String? _selectedCity;
  bool _isLoading = false;
  Gender? _selectedGender;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _usernameController.dispose();
    super.dispose();
  }

  Future<void> _handleSignUp() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final auth = context.read<AuthService>();
    if (_selectedGender == null || (_selectedCity == null || _selectedCity!.trim().isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select your city and gender')));
      setState(() => _isLoading = false);
      return;
    }

    final success = await auth.signUp(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      username: _usernameController.text.trim(),
      city: _selectedCity!.trim(),
      gender: _selectedGender!,
    );

    if (!mounted) return;

    if (success) {
      context.go('/home');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Sign up failed'), backgroundColor: Theme.of(context).colorScheme.error),
      );
    }

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop())),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.paddingLg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Text('Join EchoMatch! 🎉', style: context.textStyles.displaySmall?.bold, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              Text('Create your account and start connecting', style: context.textStyles.bodyLarge?.withColor(Theme.of(context).colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
              const SizedBox(height: 40),
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined), border: OutlineInputBorder()),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Please enter your email';
                        if (!value.contains('@')) return 'Please enter a valid email';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _usernameController,
                      decoration: const InputDecoration(labelText: 'Username', prefixIcon: Icon(Icons.person_outlined), border: OutlineInputBorder()),
                      validator: (value) {
                        final v = value?.trim() ?? '';
                        if (v.isEmpty) return 'Please enter a username';
                        if (v.length < 3) return 'Username must be at least 3 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      readOnly: true,
                      decoration: InputDecoration(
                        labelText: 'City',
                        prefixIcon: const Icon(Icons.location_city_outlined),
                        border: const OutlineInputBorder(),
                        hintText: 'Select your city',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.edit_location_alt),
                          onPressed: () async {
                            final picked = await CityPickerSheet.show(context, initialQuery: _selectedCity);
                            if (picked != null && mounted) setState(() => _selectedCity = picked);
                          },
                        ),
                      ),
                      controller: TextEditingController(text: _selectedCity ?? ''),
                      onTap: () async {
                        final picked = await CityPickerSheet.show(context, initialQuery: _selectedCity);
                        if (picked != null && mounted) setState(() => _selectedCity = picked);
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<Gender>(
                      value: _selectedGender,
                      items: const [
                        DropdownMenuItem(value: Gender.male, child: Text('Male')),
                        DropdownMenuItem(value: Gender.female, child: Text('Female')),
                      ],
                      onChanged: (g) => setState(() => _selectedGender = g),
                      decoration: const InputDecoration(labelText: 'Gender', prefixIcon: Icon(Icons.wc), border: OutlineInputBorder()),
                      validator: (value) => value == null ? 'Please select your gender' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outlined), border: OutlineInputBorder()),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Please enter a password';
                        if (value.length < 6) return 'Password must be at least 6 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _handleSignUp,
                      child: _isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Create Account'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
